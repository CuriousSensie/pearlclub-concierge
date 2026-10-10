import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/server/env";

/** Upper bound for any single database request, so a stalled call cannot hold a function open. */
const REQUEST_TIMEOUT_MS = 8_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

let client: SupabaseClient | null = null;

/** Service-role client. Server only: never import from client components. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const e = env();
  client = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch: fetchWithTimeout },
  });
  return client;
}
