import "server-only";
import type { Place } from "@/lib/types";
import { getSupabase } from "./client";
import type { Database } from "./database.types";

/** Every Place field except the (large) embedding vector, which must never leave the database. */
export const PLACE_COLUMNS =
  "id,name,city,city_slug,category,neighborhood,price_level,tags,description,lat,lng,image_url,pearlclub_url,curator,curator_slug,curator_image,curator_type" as const;

type PlaceRow = Pick<
  Database["public"]["Tables"]["places"]["Row"],
  | "id"
  | "name"
  | "city"
  | "city_slug"
  | "category"
  | "neighborhood"
  | "price_level"
  | "tags"
  | "description"
  | "lat"
  | "lng"
  | "image_url"
  | "pearlclub_url"
  | "curator"
  | "curator_slug"
  | "curator_image"
  | "curator_type"
>;

/** Normalises nullable database columns into the domain `Place`. */
export const rowToPlace = (row: PlaceRow): Place => ({ ...row, tags: row.tags ?? [] });

export async function getPlacesByIds(ids: string[]): Promise<Place[]> {
  if (!ids.length) return [];
  const { data, error } = await getSupabase().from("places").select(PLACE_COLUMNS).in("id", ids);
  if (error) throw new Error(`place lookup failed: ${error.message}`);
  const byId = new Map((data ?? []).map((row) => [row.id, rowToPlace(row)]));
  // Preserve the requested order.
  return ids.flatMap((id) => {
    const place = byId.get(id);
    return place ? [place] : [];
  });
}

// The catalogue is small and static (about 1,800 rows), so a whole city is cached per server
// instance instead of issuing a query per search. Callers must treat the returned array as read-only.
const CITY_CACHE_MS = 10 * 60_000;
const cityCache = new Map<string, { at: number; places: Place[] }>();

export async function listCityPlaces(citySlug: string, now = Date.now()): Promise<Place[]> {
  const hit = cityCache.get(citySlug);
  if (hit && now - hit.at < CITY_CACHE_MS) return hit.places;

  const { data, error } = await getSupabase()
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("city_slug", citySlug)
    .limit(5000);
  if (error) throw new Error(`city places lookup failed: ${error.message}`);
  const places = (data ?? []).map(rowToPlace);
  cityCache.set(citySlug, { at: now, places });
  return places;
}

/** Test hook: forget cached cities. */
export function clearPlaceCache(): void {
  cityCache.clear();
}

/** Semantic nearest neighbours inside one city: id -> cosine similarity (via the match_places function). */
export async function matchPlaceIds(args: {
  embedding: number[];
  citySlug: string;
  category?: string;
  priceMax?: number;
  excludeIds?: string[];
  count: number;
}): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().rpc("match_places", {
    query_embedding: JSON.stringify(args.embedding),
    p_city: args.citySlug,
    p_category: args.category ?? null,
    p_price_max: args.priceMax ?? null,
    p_exclude: args.excludeIds ?? [],
    match_count: args.count,
  });
  if (error) throw new Error(`match_places failed: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.id, row.similarity]));
}
