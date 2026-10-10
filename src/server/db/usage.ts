import "server-only";
import { getSupabase } from "@/server/db/client";

/** Atomically increments a named counter and returns its new value. */
export async function incrementUsage(key: string): Promise<number> {
  const { data, error } = await getSupabase().rpc("increment_usage", { p_session_id: key });
  if (error) throw new Error(`increment_usage failed: ${error.message}`);
  return typeof data === "number" ? data : 0;
}
