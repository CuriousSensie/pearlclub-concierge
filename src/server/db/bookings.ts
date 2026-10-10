import "server-only";
import { getSupabase } from "@/server/db/client";
import type { BookingInput } from "@/lib/schemas";
import { BOOKING_STATUSES, BOOKING_TYPES } from "@/lib/domain";
import type { Booking } from "@/types";
import type { Database } from "./database.types";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

const rowToBooking = (row: BookingRow): Booking => ({
  id: row.id,
  hotel_id: row.hotel_id,
  booking_type: BOOKING_TYPES.find((t) => t === row.booking_type) ?? "place",
  item_id: row.item_id,
  item_name: row.item_name,
  date: row.date,
  time: row.time,
  party_size: row.party_size ?? 1,
  guest_name: row.guest_name,
  guest_email: row.guest_email,
  room_number: row.room_number,
  notes: row.notes,
  status: BOOKING_STATUSES.find((st) => st === row.status) ?? "requested",
  created_at: row.created_at ?? "",
});

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
  if (!error) return { booking: rowToBooking(data), replayed: false };

  if (error.code === UNIQUE_VIOLATION) {
    const existing = await db
      .from("bookings")
      .select()
      .eq("session_id", sessionId)
      .eq("idempotency_key", input.idempotency_key)
      .single();
    if (!existing.error) return { booking: rowToBooking(existing.data), replayed: true };
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
  return (data ?? []).map(rowToBooking);
}
