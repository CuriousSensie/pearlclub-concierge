import "server-only";
import { haversineKm } from "@/lib/geo";
import { listCityPlaces } from "@/server/db/places";
import type { LiveContext } from "@/server/context/liveContext";
import type { Hotel } from "@/lib/hotels";
import type { PartOfDay, Place, PlaceSummary, Rail } from "@/lib/types";

type Anchor = { lat: number; lng: number };

const NOW_CATEGORIES: Record<PartOfDay, { dry: string[]; wet: string[] }> = {
  morning: { dry: ["breakfast", "cafe", "bakery"], wet: ["breakfast", "cafe", "bakery"] },
  lunch: { dry: ["lunch", "market", "cafe"], wet: ["lunch", "cafe", "bakery"] },
  afternoon: {
    dry: ["arts-culture", "market", "outdoor-drinks", "cafe"],
    wet: ["arts-culture", "cafe", "bakery", "shop"],
  },
  evening: { dry: ["dinner", "bar", "outdoor-drinks"], wet: ["dinner", "bar"] },
  night: { dry: ["bar", "dinner"], wet: ["bar", "dinner"] },
};
const RAIL_SIZE = 6;
/** Nearest `pool` places to the hotel, then a random `RAIL_SIZE` of them so rails stay fresh. */
function pick(places: Place[], anchor: Anchor, pool = 24): PlaceSummary[] {
  const withDistance = places
    .map((p) => ({
      ...p,
      distance_km:
        Math.round(haversineKm(anchor.lat, anchor.lng, p.lat as number, p.lng as number) * 100) /
        100,
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, pool);
  for (let i = withDistance.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [withDistance[i], withDistance[j]] = [withDistance[j], withDistance[i]];
  }
  return withDistance.slice(0, RAIL_SIZE);
}

export async function buildRails(
  hotel: Hotel,
  ctx: LiveContext,
  anchor: Anchor = hotel,
): Promise<Rail[]> {
  const all = (await listCityPlaces(hotel.city_slug)).filter(
    (p) => p.image_url && p.lat != null && p.lng != null,
  );
  const rainy = ctx.weather?.rainy ?? false;
  const cats = NOW_CATEGORIES[ctx.partOfDay][rainy ? "wet" : "dry"];
  const base = { part: ctx.partOfDay, rainy };
  const eatDrink = new Set([
    "cafe",
    "bakery",
    "breakfast",
    "lunch",
    "dinner",
    "bar",
    "market",
    "arts-culture",
  ]);

  const now = pick(
    all.filter((p) => cats.includes(p.category)),
    hotel,
  );
  const usedIds = new Set(now.map((p) => p.id));
  const local = pick(
    all.filter(
      (p) => !usedIds.has(p.id) && p.curator_type === "localPerson" && eatDrink.has(p.category),
    ),
    hotel,
    40,
  );
  local.forEach((p) => usedIds.add(p.id));
  const cheapEats = new Set(["cafe", "bakery", "breakfast", "lunch", "market"]);
  const budget = pick(
    all.filter((p) => !usedIds.has(p.id) && p.price_level === 1 && cheapEats.has(p.category)),
    anchor,
    40,
  );

  return [
    { kind: "now" as const, ...base, places: now },
    { kind: "local" as const, ...base, places: local },
    { kind: "budget" as const, ...base, places: budget },
  ].filter((r) => r.places.length);
}
