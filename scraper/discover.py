"""Phase 1a: discover how Pearl Club serves place listings.

Opens a city places page in headless Chromium, logs every XHR/fetch response and saves
JSON bodies to cache/discovery/. Usage: python discover.py [city_slug]
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import Response, sync_playwright

UA = "PearlClubConciergeMVP/0.1 (assessment project)"
BASE = "https://www.pearlclub.com"
OUT = Path(__file__).parent / "cache" / "discovery"


def main(city: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    seen: list[dict[str, str | int]] = []

    def on_response(resp: Response) -> None:
        req = resp.request
        if req.resource_type not in ("xhr", "fetch"):
            return
        ctype = resp.headers.get("content-type", "")
        entry: dict[str, str | int] = {
            "url": resp.url,
            "method": req.method,
            "status": resp.status,
            "type": ctype,
        }
        if "json" in ctype:
            try:
                body = resp.text()
                path = OUT / f"{len(seen):03d}.json"
                path.write_text(body)
                entry["file"] = path.name
                entry["bytes"] = len(body)
                if req.post_data:
                    entry["post_data"] = req.post_data[:500]
                    (OUT / f"{len(seen):03d}.request.json").write_text(
                        json.dumps({"headers": req.headers, "post_data": req.post_data}, indent=2)
                    )
            except Exception as exc:  # body may be unavailable for redirects/aborted requests
                entry["error"] = str(exc)
        seen.append(entry)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 900}).new_page()
        page.on("response", on_response)
        page.goto(f"{BASE}/cities/{city}/places", wait_until="networkidle", timeout=60000)
        for _ in range(6):
            page.mouse.wheel(0, 4000)
            page.wait_for_timeout(1200)
        (OUT / "page.html").write_text(page.content())
        browser.close()

    (OUT / "requests.json").write_text(json.dumps(seen, indent=2))
    for e in seen:
        print(e["status"], e["method"], e.get("bytes", "-"), e["url"][:140])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "london")
