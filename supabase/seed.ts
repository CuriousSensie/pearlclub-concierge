import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminClient } from "./lib";
import type { Place } from "../src/lib/types";

const BATCH = 200;

async function main(): Promise<void> {
  const supabase = adminClient();
  const places: Place[] = JSON.parse(
    readFileSync(resolve(process.cwd(), "scraper/output/places.json"), "utf8"),
  );

  for (let i = 0; i < places.length; i += BATCH) {
    const batch = places.slice(i, i + BATCH);
    const { error } = await supabase.from("places").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Batch at ${i} failed: ${error.message}`);
    console.log(`Upserted ${Math.min(i + BATCH, places.length)}/${places.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
