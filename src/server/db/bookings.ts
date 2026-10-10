import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { BookingInput } from "@/lib/schemas";
import type { Booking } from "@/types";

const UNIQUE_VIOLATION = "23505";

/**
 * Inserts a booking request. A repeat of the same (session, idempotency key) returns the original
 * row with `replayed: true` instead of creating a duplicate.
 */
export async function createBooking(
  sessionId: string,
  input: BookingInput,
  itemName: string,
): Promise<{ booking: Booking; replayed: boolean }> {
  const db = getSupabase();
  const { data, error } = await db
    .from("bookings")
    .insert({ ...input, item_name: itemName, session_id: sessionId, status: "requested" })
    .select()
    .single();
  if (!error) return { booking: data as Booking, replayed: false };

  if (error.code === UNIQUE_VIOLATION) {
    const existing = await db
      .from("bookings")
      .select()
      .eq("session_id", sessionId)
      .eq("idempotency_key", input.idempotency_key)
      .single();
    if (!existing.error) return { booking: existing.data as Booking, replayed: true };
  }
  throw new Error(`booking insert failed: ${error.message}`);
}

export async function listBookings(sessionId: string): Promise<Booking[]> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`bookings lookup failed: ${error.message}`);
  return data as Booking[];
}
