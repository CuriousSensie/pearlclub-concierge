"""Phase 1b: extract places from Pearl Club's own GraphQL endpoint (the one its city pages call).

For each city we load the public places page once in headless Chromium to capture the
exact request the site makes (endpoint, public client headers, query, city filter), then
replay it with pagination. Raw responses are cached under cache/ so re-runs never re-fetch.

Usage: python scrape.py [city_slug ...]   (defaults to the target list below)
"""

import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import BrowserContext, sync_playwright

UA = "PearlClubConciergeMVP/0.1 (assessment project)"
BASE = "https://www.pearlclub.com"
GRAPHQL_HOST = "https://pearlclub.net/"
PAGE_SIZE = 100
MIN_INTERVAL_S = 1.0
CACHE = Path(__file__).parent / "cache" / "places"
DEFAULT_CITIES = ["london", "barcelona", "new-york-city", "berlin", "lisbon"]

_last_request = 0.0


def throttle() -> None:
    """Keep to <=1 network request per second."""
    global _last_request
    wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()


def cache_path(key: str) -> Path:
    return CACHE / f"{hashlib.sha1(key.encode()).hexdigest()}.json"


def capture_template(ctx: BrowserContext, city: str) -> dict[str, Any]:
    """Load the city's places page and capture the AllPlaces GraphQL request the site makes."""
    tpl_file = cache_path(f"template:{city}")
    if tpl_file.exists():
        return json.loads(tpl_file.read_text())

    captured: dict[str, Any] = {}
    page = ctx.new_page()

    def on_request(req: Any) -> None:
        if req.url == GRAPHQL_HOST and req.method == "POST" and "allPlaces" in (req.post_data or ""):
            captured.setdefault("req", req)

    page.on("request", on_request)
    throttle()
    page.goto(f"{BASE}/cities/{city}/places", wait_until="networkidle", timeout=60000)
    page.close()
    req = captured.get("req")
    if req is None:
        raise RuntimeError(f"no AllPlaces request captured for {city}")

    body = json.loads(req.post_data)
    headers = {k: v for k, v in req.headers.items() if k in ("authorization", "content-type")}
    tpl = {"headers": headers, "query": body["query"], "variables": body["variables"]}
    tpl_file.write_text(json.dumps(tpl))
    return tpl


def fetch_page(ctx: BrowserContext, city: str, tpl: dict[str, Any], skip: int) -> dict[str, Any]:
    cache_file = cache_path(f"{city}:{skip}:{PAGE_SIZE}")
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    variables = {**tpl["variables"], "skip": skip, "first": PAGE_SIZE}
    throttle()
    resp = ctx.request.post(
        GRAPHQL_HOST,
        headers={**tpl["headers"], "referer": f"{BASE}/", "user-agent": UA},
        data=json.dumps({"query": tpl["query"], "variables": variables}),
    )
    if not resp.ok:
        raise RuntimeError(f"{city} skip={skip}: HTTP {resp.status}")
    payload = resp.json()
    if payload.get("errors"):
        raise RuntimeError(f"{city} skip={skip}: {payload['errors']}")
    cache_file.write_text(json.dumps(payload))
    return payload


def scrape_city(ctx: BrowserContext, city: str) -> list[dict[str, Any]]:
    tpl = capture_template(ctx, city)
    places: list[dict[str, Any]] = []
    skip = 0
    while True:
        data = fetch_page(ctx, city, tpl, skip)["data"]
        batch = data["allPlaces"]
        places.extend(batch)
        total = data["_allPlacesMeta"]["count"]
        skip += PAGE_SIZE
        if not batch or skip >= total:
            print(f"{city}: {len(places)}/{total} places")
            return places


def main(cities: list[str]) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    out: dict[str, list[dict[str, Any]]] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA)
        for city in cities:
            try:
                out[city] = scrape_city(ctx, city)
            except Exception as exc:  # keep going so one bad city doesn't lose the others
                print(f"{city}: FAILED — {exc}", file=sys.stderr)
        browser.close()
    raw = Path(__file__).parent / "cache" / "raw_places.json"
    raw.write_text(json.dumps(out))
    print(f"wrote {raw} ({sum(len(v) for v in out.values())} places)")


if __name__ == "__main__":
    main(sys.argv[1:] or DEFAULT_CITIES)
