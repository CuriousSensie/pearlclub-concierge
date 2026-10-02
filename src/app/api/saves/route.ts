import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { getPlacesByIds, getSavedPlaces } from "@/lib/places";
import { HttpError, assertBodySize, errorResponse, requireSessionId } from "@/lib/rateLimit";

const saveSchema = z
  .object({
    place_id: z.string().min(1).optional(),
    place_ids: z.array(z.string().min(1)).max(20).optional(),
  })
  .refine((v) => v.place_id || v.place_ids?.length, "place_id or place_ids is required");

export async function GET(req: Request): Promise<Response> {
  try {
    return Response.json({ places: await getSavedPlaces(requireSessionId(req)) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    assertBodySize(req);
    const parsed = saveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));

    const ids = [
      ...new Set([
        ...(parsed.data.place_ids ?? []),
        ...(parsed.data.place_id ? [parsed.data.place_id] : []),
      ]),
    ];
    const places = await getPlacesByIds(ids);
    if (places.length !== ids.length) throw new HttpError(400, "One or more places do not exist");

    const { error } = await getSupabase()
      .from("saved_places")
      .upsert(
        ids.map((place_id) => ({ session_id: sessionId, place_id })),
        { onConflict: "session_id,place_id" },
      );
    if (error) throw new Error(`save failed: ${error.message}`);
    return Response.json({ saved: ids }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    const placeId = new URL(req.url).searchParams.get("place_id");
    if (!placeId) throw new HttpError(400, "place_id query param is required");
    const { error } = await getSupabase()
      .from("saved_places")
      .delete()
      .eq("session_id", sessionId)
      .eq("place_id", placeId);
    if (error) throw new Error(`unsave failed: ${error.message}`);
    return Response.json({ removed: placeId });
  } catch (err) {
    return errorResponse(err);
  }
}
