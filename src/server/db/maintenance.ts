import "server-only";
import { getSupabase } from "@/server/db/client";

/** Deletes expired rate-limit counters and old booking requests; returns how many rows went. */
export async function purgeExpired(): Promise<{ usage: number; bookings: number }> {
  const db = getSupabase();
  const [usage, bookings] = await Promise.all([
    db.rpc("purge_usage"),
    db.rpc("purge_old_bookings"),
  ]);
  if (usage.error) throw new Error(`purge_usage failed: ${usage.error.message}`);
  if (bookings.error) throw new Error(`purge_old_bookings failed: ${bookings.error.message}`);
  return { usage: usage.data ?? 0, bookings: bookings.data ?? 0 };
}
