import { LIMITS } from "@/lib/domain";
import { getPlacesByIds, getSavedPlaces } from "@/lib/places";
import { idSchema, saveRequestSchema } from "@/lib/schemas";
import { removeSavedPlace, savePlaces } from "@/server/db/saves";
import { HttpError, errorResponse } from "@/server/http/errors";
import { getRequestId, readJson, requireSessionId } from "@/server/http/guards";
import { enforceReadLimit, enforceWriteLimit } from "@/server/http/rateLimit";

export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceReadLimit(req);
    return Response.json({ places: await getSavedPlaces(sessionId) });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceWriteLimit(req);
    const parsed = saveRequestSchema.safeParse(await readJson(req, LIMITS.writeBodyBytes));
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));

    const ids = [
      ...new Set([
        ...(parsed.data.place_ids ?? []),
        ...(parsed.data.place_id ? [parsed.data.place_id] : []),
      ]),
    ];
    if ((await getPlacesByIds(ids)).length !== ids.length) {
      throw new HttpError(400, "One or more places do not exist");
    }
    await savePlaces(sessionId, ids);
    return Response.json({ saved: ids }, { status: 201 });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceWriteLimit(req);
    const placeId = idSchema.safeParse(new URL(req.url).searchParams.get("place_id"));
    if (!placeId.success) throw new HttpError(400, "place_id query param is required");
    await removeSavedPlace(sessionId, placeId.data);
    return Response.json({ removed: placeId.data });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
