import { createUIMessageStreamResponse } from "ai";
import { LIMITS } from "@/lib/domain";
import { getHotel } from "@/lib/hotels";
import { isLanguage } from "@/lib/i18n";
import { parseChatMessages } from "@/lib/schemas";
import { createConciergeStream } from "@/server/ai/chat";
import { getLiveContext } from "@/server/context/liveContext";
import { getProfile } from "@/server/db/profiles";
import { getSavedPlaces } from "@/server/db/saves";
import { HttpError, errorResponse } from "@/server/http/errors";
import { getRequestId, readJson, requireSessionId } from "@/server/http/guards";
import { enforceChatLimit } from "@/server/http/rateLimit";

export const maxDuration = 30;

/** Validates the request, loads the guest's context, and streams the concierge's reply. */
export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  try {
    const sessionId = requireSessionId(req);
    const body = parseChatMessages(await readJson(req, LIMITS.chatBodyBytes));
    if (!body) throw new HttpError(400, "Invalid request body");

    const hotel = getHotel(body.hotelId);
    // Independent lookups run together; the rate-limit check throws before any model work starts.
    const [, profile, savedPlaces, live] = await Promise.all([
      enforceChatLimit(req, sessionId),
      getProfile(sessionId),
      getSavedPlaces(sessionId),
      getLiveContext(hotel),
    ]);

    const stream = await createConciergeStream({
      requestId,
      startedAt,
      sessionId,
      messages: body.messages,
      hotel,
      language: isLanguage(body.language) ? body.language : "en",
      userLocation: body.userLocation ?? null,
      profile,
      savedPlaces,
      live,
    });
    return createUIMessageStreamResponse({ stream, headers: { "x-request-id": requestId } });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
