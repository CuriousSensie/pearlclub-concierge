import "server-only";
import { matchPlaceIds } from "@/server/db/places";
import { hasOpenAI } from "@/server/ai/model";
import { log } from "@/server/logger";
import { embedQuery } from "./embeddings";

export type VectorQuery = {
  query: string;
  citySlug: string;
  category?: string;
  priceMax?: number;
  excludeIds?: string[];
  limit: number;
};

// After a failure (for example the migration is not applied yet) skip vectors for a minute.
let retryAt = 0;

/** Top semantic matches (id -> similarity), or null when vector search is unavailable or empty. */
export async function vectorMatches(q: VectorQuery): Promise<Map<string, number> | null> {
  if (Date.now() < retryAt || !hasOpenAI() || !q.query.trim()) return null;
  try {
    const matches = await matchPlaceIds({
      embedding: await embedQuery(q.query),
      citySlug: q.citySlug,
      category: q.category,
      priceMax: q.priceMax,
      excludeIds: q.excludeIds,
      count: Math.max(40, q.limit * 6),
    });
    return matches.size ? matches : null;
  } catch (err) {
    log.warn("search.vector_unavailable", { err });
    retryAt = Date.now() + 60_000;
    return null;
  }
}
