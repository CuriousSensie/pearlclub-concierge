import "server-only";
import { getSupabase } from "@/server/db/client";

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
