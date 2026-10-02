import "server-only";
import { getSupabase } from "./supabase";
import { haversineKm } from "./geo";
import type { Place, PlaceSummary } from "@/types";

export type SearchParams = {
  city_slug: string;
  category?: string;
  price_max?: number;
  tags?: string[];
  query?: string;
  near?: { lat: number; lng: number };
  limit: number;
  excludeIds?: string[];
  interests?: string[];
};

const POOL_SIZE = 200;
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "near",
  "some",
  "something",
  "place",
  "places",
]);

/** Keywords safe to embed in a PostgREST `or` filter. */
function keywords(query: string | undefined): string[] {
  if (!query) return [];
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 6);
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function searchPlaces(p: SearchParams): Promise<PlaceSummary[]> {
  let q = getSupabase().from("places").select("*").eq("city_slug", p.city_slug);
  if (p.category) q = q.eq("category", p.category);
  if (p.price_max) q = q.lte("price_level", p.price_max);
  if (p.tags?.length)
    q = q.overlaps(
      "tags",
      p.tags.map((t) => t.toLowerCase().replace(/^#/, "")),
    );
  if (p.excludeIds?.length) q = q.not("id", "in", `(${p.excludeIds.join(",")})`);

  const kws = keywords(p.query);
  if (kws.length) q = q.or(kws.map((k) => `search_text.ilike.%${k}%`).join(","));

  const { data, error } = await q.limit(POOL_SIZE);
  if (error) throw new Error(`search_places failed: ${error.message}`);
  const rows = (data ?? []) as Place[];

  const interests = (p.interests ?? []).map((i) => i.toLowerCase());
  const scored = shuffle(rows).map((place) => {
    const text = `${place.name} ${place.description ?? ""} ${place.tags.join(" ")}`.toLowerCase();
    const kwScore = kws.filter((k) => text.includes(k)).length;
    const interestScore = interests.filter((i) => text.includes(i)).length;
    const distance =
      p.near && place.lat != null && place.lng != null
        ? haversineKm(p.near.lat, p.near.lng, place.lat, place.lng)
        : null;
    return { place, score: kwScore * 2 + interestScore, distance };
  });

  scored.sort((a, b) => {
    if (p.near) {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      // Nearby first, but let strong relevance matches win within ~1.5 km.
      return a.distance - 0.75 * a.score - (b.distance - 0.75 * b.score);
    }
    return b.score - a.score;
  });

  return scored.slice(0, p.limit).map(({ place, distance }) => ({
    ...place,
    distance_km: distance != null ? Math.round(distance * 100) / 100 : null,
  }));
}

export async function getPlacesByIds(ids: string[]): Promise<Place[]> {
  if (!ids.length) return [];
  const { data, error } = await getSupabase().from("places").select("*").in("id", ids);
  if (error) throw new Error(`place lookup failed: ${error.message}`);
  const byId = new Map((data as Place[]).map((pl) => [pl.id, pl]));
  // Preserve the requested order.
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as Place] : []));
}

export async function getSavedPlaces(sessionId: string): Promise<Place[]> {
  const { data, error } = await getSupabase()
    .from("saved_places")
    .select("created_at, places(*)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`saved places lookup failed: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const place = row.places as unknown as Place | null;
    return place ? [place] : [];
  });
}
