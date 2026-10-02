import "server-only";
import { haversineKm } from "./geo";
import { getSupabase } from "./supabase";
import type { LiveContext, PartOfDay } from "./context";
import type { Hotel } from "./hotels";
import type { PlaceSummary, Place } from "@/types";

export type RailKind = "now" | "local" | "budget";
export type Rail = { kind: RailKind; part: PartOfDay; rainy: boolean; places: PlaceSummary[] };

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
const CACHE_MS = 10 * 60_000;
const cityCache = new Map<string, { at: number; places: Place[] }>();

/** All places with photos for a city; the table is static so cache it briefly. */
async function cityPlaces(citySlug: string): Promise<Place[]> {
  const hit = cityCache.get(citySlug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places;
  const { data, error } = await getSupabase()
    .from("places")
    .select("*")
    .eq("city_slug", citySlug)
    .not("image_url", "is", null)
    .not("lat", "is", null);
  if (error) throw new Error(`rails lookup failed: ${error.message}`);
  const places = (data ?? []) as Place[];
  cityCache.set(citySlug, { at: Date.now(), places });
  return places;
}

/** Nearest `pool` places to the hotel, then a random `RAIL_SIZE` of them so rails stay fresh. */
function pick(places: Place[], hotel: Hotel, pool = 24): PlaceSummary[] {
  const withDistance = places
    .map((p) => ({
      ...p,
      distance_km:
        Math.round(haversineKm(hotel.lat, hotel.lng, p.lat as number, p.lng as number) * 100) / 100,
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, pool);
  for (let i = withDistance.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [withDistance[i], withDistance[j]] = [withDistance[j], withDistance[i]];
  }
  return withDistance.slice(0, RAIL_SIZE);
}

export async function buildRails(hotel: Hotel, ctx: LiveContext): Promise<Rail[]> {
  const all = await cityPlaces(hotel.city_slug);
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
    hotel,
    40,
  );

  return [
    { kind: "now" as const, ...base, places: now },
    { kind: "local" as const, ...base, places: local },
    { kind: "budget" as const, ...base, places: budget },
  ].filter((r) => r.places.length);
}
