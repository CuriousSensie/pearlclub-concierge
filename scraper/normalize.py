"""Phase 1c: clean + validate raw GraphQL places into output/places.json (the Place schema).

Usage: python normalize.py
"""

import json
from collections import Counter
from pathlib import Path
from typing import Any

HERE = Path(__file__).parent
RAW = HERE / "cache" / "raw_places.json"
OUT = HERE / "output" / "places.json"
SITE = "https://www.pearlclub.com"
MAX_DESC = 600

# Pearl Club category key -> normalized category. Unmapped keys become "other".
CATEGORY_MAP = {
    "dinner": "dinner",
    "late-night-food": "dinner",
    "lunch": "lunch",
    "breakfast": "breakfast",
    "cafes": "cafe",
    "bakeries": "bakery",
    "bars": "bar",
    "nightlife": "bar",
    "outdoor-drinks": "outdoor-drinks",
    "arts-and-culture": "arts-culture",
    "live-entertainment": "arts-culture",
    "markets": "market",
    "stays": "stay",
    "shopping": "shop",
}
PRICE_LEVEL = {"0-15": 1, "15-50": 2, "50-100": 3, "100plus": 4}
TIME_TAG = {
    "I have one day": "one-day",
    "I have one weekend": "weekend",
    "I have one week": "one-week",
    "I have one month": "one-month",
    "I have one season": "one-season",
}


def first_nonempty(*values: str | None) -> str | None:
    for v in values:
        if v and v.strip():
            return " ".join(v.split())
    return None


def trim(text: str | None) -> str | None:
    if not text:
        return None
    if len(text) <= MAX_DESC:
        return text
    return text[: MAX_DESC - 1].rsplit(" ", 1)[0].rstrip(",;:.") + "…"


def normalize(raw: dict[str, Any]) -> dict[str, Any] | None:
    cat = raw.get("customCategory") or raw.get("placeCategory") or {}
    cat_key = cat.get("key") or ""
    city = raw.get("city") or {}
    slug = raw.get("customSlug") or raw.get("slug")
    name = first_nonempty(raw.get("customName"), raw.get("name"))
    if not (name and slug and city.get("slug") and cat_key):
        return None

    price = raw.get("customPriceRange") or raw.get("priceRange") or {}
    loc = raw.get("location") or {}
    images = raw.get("customMedia") or raw.get("images") or []
    spotlight = raw.get("curatorSpotlight") or next(iter(raw.get("curators") or []), None) or {}
    time_name = (raw.get("timeRating") or {}).get("name", "")

    tags = [cat_key, TIME_TAG.get(time_name)]
    if price.get("key") == "0-15":
        tags.append("budget")
    elif price.get("key") == "100plus":
        tags.append("splurge")

    return {
        "id": raw["id"],
        "name": name,
        "city": city.get("name") or city["slug"],
        "city_slug": city["slug"],
        "category": CATEGORY_MAP.get(cat_key, "other"),
        "neighborhood": None,  # not exposed by the Pearl Club API
        "price_level": PRICE_LEVEL.get(price.get("key") or ""),
        "tags": [t for t in dict.fromkeys(tags) if t],
        "description": trim(first_nonempty(raw.get("customDescription"), raw.get("description"))),
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
        "image_url": (images[0]["url"] + "?w=800&auto=format") if images else None,
        "pearlclub_url": f"{SITE}/cities/{city['slug']}/{cat_key}/{slug}",
        "curator": spotlight.get("name"),
        "curator_slug": spotlight.get("slug"),
        "curator_image": (spotlight.get("profileImage") or {}).get("url"),
        "curator_type": (spotlight.get("localType") or {}).get("key"),
    }


def main() -> None:
    raw_by_city: dict[str, list[dict[str, Any]]] = json.loads(RAW.read_text())
    seen: set[str] = set()
    places: list[dict[str, Any]] = []
    dropped = 0
    for raws in raw_by_city.values():
        for raw in raws:
            place = normalize(raw)
            if place is None or place["id"] in seen:
                dropped += 1
                continue
            seen.add(place["id"])
            places.append(place)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(places, indent=1, ensure_ascii=False))

    n = len(places)
    pct = lambda k: f"{100 * sum(1 for p in places if k(p)) / n:.0f}%"  # noqa: E731
    print(f"{n} places written to {OUT} (dropped {dropped})")
    print("per city:", dict(Counter(p["city_slug"] for p in places)))
    print("per category:", dict(Counter(p["category"] for p in places).most_common()))
    print("coords:", pct(lambda p: p["lat"] is not None and p["lng"] is not None))
    print("description:", pct(lambda p: p["description"]))
    print("image:", pct(lambda p: p["image_url"]))


if __name__ == "__main__":
    main()
