import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Loads KEY=value pairs from .env.local into process.env (existing variables win). */
export function loadEnvLocal(): void {
  try {
    for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=['"]?([^'"#\s]*)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (err) {
    console.warn("No .env.local read:", (err as Error).message);
  }
}

/** A service-role client for the maintenance scripts (seed, embed). Throws if not configured. */
export function adminClient(): SupabaseClient {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}
