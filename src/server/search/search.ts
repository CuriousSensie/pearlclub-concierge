import "server-only";
import { haversineKm } from "@/lib/geo";
import { idSchema } from "@/lib/schemas";
import type { Place, PlaceSummary } from "@/lib/types";
import { listCityPlaces } from "@/server/db/places";
import { vectorMatches, type VectorQuery } from "./vector";

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

/** Seams for tests: where places and semantic matches come from. */
export type SearchDeps = {
  cityPlaces: (citySlug: string) => Promise<Place[]>;
  vector: (q: VectorQuery) => Promise<Map<string, number> | null>;
};

const defaultDeps: SearchDeps = { cityPlaces: listCityPlaces, vector: vectorMatches };

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

/** Meaningful words from a free-text query (letters/digits only, at most six). */
export function keywords(query: string | undefined): string[] {
  if (!query) return [];
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 6);
}

const searchText = (p: Place): string =>
  `${p.name} ${p.description ?? ""} ${p.neighborhood ?? ""} ${p.tags.join(" ")}`.toLowerCase();

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Finds places in one city. A free-text query uses semantic similarity when available and falls back
 * to keyword matching; results are ranked by relevance, the guest's interests and, when a location
 * is known, distance.
 */
export async function searchPlaces(
  p: SearchParams,
  deps: SearchDeps = defaultDeps,
): Promise<PlaceSummary[]> {
  const kws = keywords(p.query);
  const excluded = new Set((p.excludeIds ?? []).filter((id) => idSchema.safeParse(id).success));
  const wantedTags = (p.tags ?? []).map((t) => t.toLowerCase().replace(/^#/, ""));
  const cityPlaces = await deps.cityPlaces(p.city_slug);

  const matches = (place: Place, { tags = true, text = true } = {}): boolean =>
    !excluded.has(place.id) &&
    (!p.category || place.category === p.category) &&
    (!p.price_max || (place.price_level ?? 0) <= p.price_max) &&
    (!tags || !wantedTags.length || place.tags.some((t) => wantedTags.includes(t))) &&
    (!text || !kws.length || kws.some((k) => searchText(place).includes(k)));

  // Vibe queries use embeddings; without a query (or if vectors are unavailable) fall back to keywords.
  const sims = p.query?.trim()
    ? await deps.vector({
        query: p.query,
        citySlug: p.city_slug,
        category: p.category,
        priceMax: p.price_max,
        excludeIds: [...excluded],
        limit: p.limit,
      })
    : null;

  let rows: Place[];
  if (sims) {
    rows = cityPlaces.filter((place) => sims.has(place.id));
  } else {
    // Keywords narrow the pool, but a thin match must not return nothing: top up from the
    // unfiltered pool so vague queries ("something cozy") still surface real places.
    rows = cityPlaces.filter((place) => matches(place));
    if (!rows.length && wantedTags.length)
      rows = cityPlaces.filter((pl) => matches(pl, { tags: false }));
    if (kws.length && rows.length < p.limit) {
      const seen = new Set(rows.map((r) => r.id));
      rows = [
        ...rows,
        ...cityPlaces.filter((pl) => matches(pl, { text: false }) && !seen.has(pl.id)),
      ];
    }
  }

  const simValues = sims ? [...sims.values()] : [];
  const simMin = simValues.length ? Math.min(...simValues) : 0;
  const simRange = simValues.length ? Math.max(...simValues) - simMin || 1 : 1;
  const interests = (p.interests ?? []).map((i) => i.toLowerCase());

  const scored = shuffle(rows, p.random ?? Math.random).map((place) => {
    const text = searchText(place);
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
