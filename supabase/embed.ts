import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Place } from "../src/types";

const BATCH = 100;

function loadEnvLocal(): void {
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=['"]?([^'"#\s]*)/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/** One short document per place: what it is, where, and the local's description. */
const toDocument = (p: Place): string =>
  [
    `${p.name} — ${p.category.replace(/-/g, " ")} in ${p.city}`,
    p.price_level ? `Price ${"$".repeat(p.price_level)}` : null,
    p.description,
    p.tags.length ? `Tags: ${p.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.OPENAI_API_KEY) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const places: Place[] = JSON.parse(readFileSync("scraper/output/places.json", "utf8"));

  for (let i = 0; i < places.length; i += BATCH) {
    const batch = places.slice(i, i + BATCH);
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: batch.map(toDocument),
    });
    const rows = batch.map((p, j) => ({ id: p.id, embedding: JSON.stringify(embeddings[j]) }));
    // Update only the embedding column; other columns keep their values.
    const results = await Promise.all(
      rows.map((r) => supabase.from("places").update({ embedding: r.embedding }).eq("id", r.id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`Batch at ${i} failed: ${failed.error.message}`);
    console.log(`Embedded ${Math.min(i + BATCH, places.length)}/${places.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
