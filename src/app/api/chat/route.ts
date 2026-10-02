import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getHotel } from "@/lib/hotels";
import { isLanguage } from "@/lib/i18n";
import { buildSystemPrompt } from "@/lib/prompts";
import { getProfile } from "@/lib/profile";
import { getSavedPlaces } from "@/lib/places";
import {
  HttpError,
  MAX_HISTORY_MESSAGES,
  MAX_INPUT_CHARS,
  assertBodySize,
  enforceRateLimit,
  errorResponse,
  requireSessionId,
} from "@/lib/rateLimit";
import { createTools } from "@/lib/tools";

export const maxDuration = 30;

const bodySchema = z.object({
  messages: z
    .array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null && "parts" in m))
    .min(1),
  hotelId: z.string().optional(),
  language: z.string().optional(),
  userLocation: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullish(),
});

/** Keep the last N messages (starting on a user turn) and cap user text length. */
function prepareMessages(messages: UIMessage[]): UIMessage[] {
  let recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === "user");
  recent = firstUser > 0 ? recent.slice(firstUser) : recent;
  return recent.map((m) =>
    m.role !== "user"
      ? m
      : {
          ...m,
          parts: m.parts.map((p) =>
            p.type === "text" ? { ...p, text: p.text.slice(0, MAX_INPUT_CHARS) } : p,
          ),
        },
  );
}

export async function POST(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    assertBodySize(req);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request body");
    const { messages, hotelId, userLocation } = parsed.data;
    const language = isLanguage(parsed.data.language) ? parsed.data.language : "en";

    const modelId = process.env.OPENAI_MODEL;
    if (!modelId) throw new HttpError(500, "OPENAI_MODEL is not configured");

    await enforceRateLimit(sessionId);

    const hotel = getHotel(hotelId);
    const [profile, savedPlaces] = await Promise.all([
      getProfile(sessionId),
      getSavedPlaces(sessionId),
    ]);
    const location = userLocation ?? null;

    const result = streamText({
      model: openai(modelId),
      instructions: buildSystemPrompt({
        hotel,
        profile,
        savedPlaces,
        language,
        userLocation: location,
        now: new Date(),
      }),
      messages: await convertToModelMessages(prepareMessages(messages)),
      tools: createTools({
        sessionId,
        hotel,
        profile,
        savedIds: savedPlaces.map((p) => p.id),
        userLocation: location,
      }),
      stopWhen: isStepCount(6),
    });

    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  } catch (err) {
    return errorResponse(err);
  }
}
