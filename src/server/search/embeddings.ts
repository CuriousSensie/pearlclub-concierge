import "server-only";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

const EMBED_MODEL = "text-embedding-3-small";
const MAX_CACHED = 200;

// Cache the promise, not the vector, so concurrent searches for the same text share one API call.
const cache = new Map<string, Promise<number[]>>();

/** Embeds a short query (cached per server instance). */
export function embedQuery(text: string): Promise<number[]> {
  const key = text.trim().toLowerCase();
  let pending = cache.get(key);
  if (!pending) {
    if (cache.size >= MAX_CACHED) cache.clear();
    pending = embed({ model: openai.embedding(EMBED_MODEL), value: key }).then((r) => r.embedding);
    pending.catch(() => cache.delete(key)); // don't cache failures
    cache.set(key, pending);
  }
  return pending;
}
