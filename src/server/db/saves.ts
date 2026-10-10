import "server-only";
import type { Place } from "@/lib/types";
import { getSupabase } from "./client";
import { getPlacesByIds } from "./places";

export async function savePlaces(sessionId: string, placeIds: string[]): Promise<void> {
  const { error } = await getSupabase()
    .from("saved_places")
    .upsert(
      placeIds.map((place_id) => ({ session_id: sessionId, place_id })),
      { onConflict: "session_id,place_id" },
    );
  if (error) throw new Error(`save failed: ${error.message}`);
}

export async function removeSavedPlace(sessionId: string, placeId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("saved_places")
    .delete()
    .eq("session_id", sessionId)
    .eq("place_id", placeId);
  if (error) throw new Error(`unsave failed: ${error.message}`);
}

/** The guest's saved places, newest first. */
export async function getSavedPlaces(sessionId: string): Promise<Place[]> {
  const { data, error } = await getSupabase()
    .from("saved_places")
    .select("place_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`saved places lookup failed: ${error.message}`);
  return getPlacesByIds((data ?? []).map((row) => row.place_id));
}
