import "server-only";
import { haversineKm } from "./geo";
import { getPlacesByIds, searchPlaces } from "./places";
import type { Hotel } from "./hotels";
import type { PlaceSummary, TimeSlot } from "@/types";

export type PlannedStop = {
  time_slot: TimeSlot;
  place: PlaceSummary;
  reason: string;
  /** Estimated walking minutes from the previous stop (or the hotel for the first). */
  walk_min: number | null;
};

const SLOT_ORDER: TimeSlot[] = ["morning", "lunch", "afternoon", "evening"];
const SLOT_CATEGORIES = (rainy: boolean): Record<TimeSlot, string[]> => ({
  morning: ["cafe", "bakery", "breakfast"],
  lunch: ["lunch", "market", "cafe"],
  afternoon: rainy
    ? ["arts-culture", "cafe", "bakery", "shop"]
    : ["arts-culture", "market", "outdoor-drinks", "shop"],
  evening: ["dinner"],
});
const WALK_M_PER_MIN = 80;
const STREET_FACTOR = 1.3; // straight-line distance understates real walking routes

/** The first sentence of a place description, capped, used as the stop's reason. */
function firstSentence(text: string | null, max = 150): string {
  if (!text) return "";
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

const walkMinutes = (
  a: { lat: number; lng: number },
  b: { lat: number | null; lng: number | null },
): number | null =>
  b.lat == null || b.lng == null
    ? null
    : Math.max(
        1,
        Math.round(
          (haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000 * STREET_FACTOR) / WALK_M_PER_MIN,
        ),
      );

export async function buildPlan(opts: {
  hotel: Hotel;
  citySlug: string;
  vibe?: string;
  slots?: TimeSlot[];
  keep?: { time_slot: TimeSlot; place_id: string }[];
  excludeIds?: string[];
  interests?: string[];
  rainy: boolean;
}): Promise<PlannedStop[]> {
  const slots = SLOT_ORDER.filter((s) => (opts.slots?.length ? opts.slots.includes(s) : true));
  const keptPlaces = new Map(
    (await getPlacesByIds((opts.keep ?? []).map((k) => k.place_id))).map((p) => [p.id, p]),
  );
  const keptBySlot = new Map(
    (opts.keep ?? []).map((k) => [k.time_slot, keptPlaces.get(k.place_id)]),
  );
  const used = new Set<string>([...(opts.excludeIds ?? []), ...keptPlaces.keys()]);
  const categories = SLOT_CATEGORIES(opts.rainy);

  let anchor = { lat: opts.hotel.lat, lng: opts.hotel.lng };
  const stops: PlannedStop[] = [];
  for (const slot of slots) {
    let chosen: PlaceSummary | undefined = keptBySlot.get(slot);
    if (!chosen) {
      const pools = await Promise.all(
        categories[slot].map((category) =>
          searchPlaces({
            city_slug: opts.citySlug,
            category,
            query: opts.vibe,
            near: anchor,
            limit: 4,
            interests: opts.interests,
            excludeIds: [...used],
          }),
        ),
      );
      // Best-ranked candidate overall: nearest to where the guest will be, after relevance.
      chosen = pools
        .flat()
        .filter((p) => p.lat != null && p.lng != null && !used.has(p.id))
        .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))[0];
    }
    if (!chosen) continue;
    used.add(chosen.id);
    stops.push({
      time_slot: slot,
      place: chosen,
      reason: firstSentence(chosen.description),
      walk_min: walkMinutes(anchor, chosen),
    });
    if (chosen.lat != null && chosen.lng != null) anchor = { lat: chosen.lat, lng: chosen.lng };
  }
  return stops;
}
