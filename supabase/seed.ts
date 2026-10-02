import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Place } from "../src/types";

const BATCH = 200;

function loadEnvLocal(): void {
  try {
    for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=([^#\s]*)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (err) {
    console.warn("No .env.local read:", (err as Error).message);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
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
