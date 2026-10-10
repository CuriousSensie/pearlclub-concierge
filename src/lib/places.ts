import "server-only";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { getSupabase } from "@/server/db/client";
import { haversineKm } from "./geo";
import { hasOpenAI } from "./model";
import { idSchema } from "./schemas";
import type { Database } from "@/server/db/database.types";
import type { Place, PlaceSummary } from "@/types";

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
  /** Source of randomness for tie-breaking; injectable so tests are deterministic. */
  random?: () => number;
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
  "hidden",
  "gem",
  "gems",
  "best",
  "good",
  "great",
  "local",
  "nearby",
  "spot",
  "spots",
  "recommend",
  "find",
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

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function searchPlaces(p: SearchParams): Promise<PlaceSummary[]> {
  const kws = keywords(p.query);
  // Only well-formed ids are interpolated into the PostgREST filter below.
  const excludeIds = (p.excludeIds ?? []).filter((id) => idSchema.safeParse(id).success);

  const run = async (withKeywords: boolean, ignoreTags = false): Promise<Place[]> => {
    let q = getSupabase().from("places").select(PLACE_COLUMNS).eq("city_slug", p.city_slug);
    if (p.category) q = q.eq("category", p.category);
    if (p.price_max) q = q.lte("price_level", p.price_max);
    if (p.tags?.length && !ignoreTags)
      q = q.overlaps(
        "tags",
        p.tags.map((t) => t.toLowerCase().replace(/^#/, "")),
      );
    if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
    if (withKeywords && kws.length) q = q.or(kws.map((k) => `search_text.ilike.%${k}%`).join(","));
    const { data, error } = await q.limit(POOL_SIZE);
    if (error) throw new Error(`search_places failed: ${error.message}`);
    return (data ?? []).map(rowToPlace);
  };

  // Vibe queries use embeddings; without a query (or if vectors are unavailable) fall back to keywords.
  const sims = p.query?.trim() ? await vectorMatches(p) : null;
  let rows: Place[];
  if (sims) {
    rows = await getPlacesByIds([...sims.keys()]);
  } else {
    // Keywords narrow the pool, but a thin match must not return nothing: top up from the
    // unfiltered pool so vague queries ("something cozy") still surface real places.
    rows = await run(true);
    if (!rows.length && p.tags?.length) rows = await run(true, true);
    if (kws.length && rows.length < p.limit) {
      const seen = new Set(rows.map((r) => r.id));
      rows = [...rows, ...(await run(false)).filter((r) => !seen.has(r.id))];
    }
  }

  const simValues = sims ? [...sims.values()] : [];
  const simMin = simValues.length ? Math.min(...simValues) : 0;
  const simRange = simValues.length ? Math.max(...simValues) - simMin || 1 : 1;
  const interests = (p.interests ?? []).map((i) => i.toLowerCase());
  const scored = shuffle(rows, p.random ?? Math.random).map((place) => {
    const text = `${place.name} ${place.description ?? ""} ${place.tags.join(" ")}`.toLowerCase();
    const interestScore = interests.filter((i) => text.includes(i)).length;
    // Relevance in [0, 1]: normalised vector similarity, or keyword hits.
    const relevance = sims
      ? ((sims.get(place.id) ?? simMin) - simMin) / simRange
      : Math.min(1, kws.filter((k) => text.includes(k)).length / 2);
    const distance =
      p.near && place.lat != null && place.lng != null
        ? haversineKm(p.near.lat, p.near.lng, place.lat, place.lng)
        : null;
    return { place, relevance, interestScore, distance };
  });

  scored.sort((a, b) => {
    if (p.near) {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      // Nearby first, but a strong match can outrank ~2.5 km of extra distance.
      const rank = (x: typeof a) =>
        (x.distance as number) - 2.5 * x.relevance - 0.4 * x.interestScore;
      return rank(a) - rank(b);
    }
    return b.relevance * 3 + b.interestScore * 0.5 - (a.relevance * 3 + a.interestScore * 0.5);
  });

  return scored.slice(0, p.limit).map(({ place, distance }) => ({
    ...place,
    distance_km: distance != null ? Math.round(distance * 100) / 100 : null,
  }));
}

const EMBED_MODEL = "text-embedding-3-small";
// Cache the promise, not the vector, so concurrent searches for the same text share one API call.
const embeddingCache = new Map<string, Promise<number[]>>();
let vectorsRetryAt = 0; // after a failure, skip vectors for a minute (e.g. migration not applied yet)

function embedQuery(query: string): Promise<number[]> {
  const key = query.trim().toLowerCase();
  let pending = embeddingCache.get(key);
  if (!pending) {
    if (embeddingCache.size > 200) embeddingCache.clear();
    pending = embed({ model: openai.embedding(EMBED_MODEL), value: key }).then((r) => r.embedding);
    pending.catch(() => embeddingCache.delete(key)); // don't cache failures
    embeddingCache.set(key, pending);
  }
  return pending;
}

/** Top semantic matches (id -> cosine similarity), or null if vector search isn't available. */
async function vectorMatches(p: SearchParams): Promise<Map<string, number> | null> {
  if (Date.now() < vectorsRetryAt || !hasOpenAI() || !p.query) return null;
  try {
    const embedding = await embedQuery(p.query);
    const { data, error } = await getSupabase().rpc("match_places", {
      query_embedding: JSON.stringify(embedding),
      p_city: p.city_slug,
      p_category: p.category ?? null,
      p_price_max: p.price_max ?? null,
      p_exclude: (p.excludeIds ?? []).filter((id) => idSchema.safeParse(id).success),
      match_count: Math.max(40, p.limit * 6),
    });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; similarity: number }[];
    return rows.length ? new Map(rows.map((r) => [r.id, r.similarity])) : null;
  } catch (err) {
    // Missing migration or a transient embedding failure: keyword search still works.
    console.warn(
      "vector search unavailable, using keywords:",
      err instanceof Error ? err.message : err,
    );
    vectorsRetryAt = Date.now() + 60_000;
    return null;
  }
}

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

/** The guest's saved places, newest first. */
export async function getSavedPlaces(sessionId: string): Promise<Place[]> {
  const { data, error } = await getSupabase()
    .from("saved_places")
    .select("place_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`saved places lookup failed: ${error.message}`);
  return getPlacesByIds((data ?? []).map((row) => row.place_id));
}
