import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { pickModel } from "@/lib/model";
import { getHotel } from "@/lib/hotels";
import { isLanguage } from "@/lib/i18n";
import { buildFollowupPrompt, buildSystemPrompt } from "@/lib/prompts";
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

    await enforceRateLimit(sessionId);

    const hotel = getHotel(hotelId);
    const [profile, savedPlaces] = await Promise.all([
      getProfile(sessionId),
      getSavedPlaces(sessionId),
    ]);
    const location = userLocation ?? null;

    const { suggest_followups, ...mainTools } = createTools({
      sessionId,
      hotel,
      profile,
      savedIds: savedPlaces.map((p) => p.id),
      userLocation: location,
    });
    const model = pickModel();
    const history = await convertToModelMessages(prepareMessages(messages));

    const stream = createUIMessageStream({
      onError: (err) => {
        console.error("chat stream error", err);
        // Surface provider rate limits distinctly so the UI can say "busy" instead of "broken".
        return APICallError.isInstance(err) && err.statusCode === 429
          ? "model_busy"
          : "An error occurred.";
      },
      execute: async ({ writer }) => {
        writer.write({ type: "start" });

        // Pass 1: the answer, with the real tools (search, plan, booking, ...).
        const answer = streamText({
          model,
          instructions: buildSystemPrompt({
            hotel,
            profile,
            savedPlaces,
            language,
            userLocation: location,
            now: new Date(),
          }),
          messages: history,
          tools: mainTools,
          stopWhen: isStepCount(6),
        });
        writer.merge(
          toUIMessageStream({ stream: answer.stream, sendStart: false, sendFinish: false }),
        );
        const answerMessages = await answer.responseMessages;

        // Pass 2: follow-up chips, forced so every turn has them regardless of model compliance.
        const followups = streamText({
          model,
          instructions: buildFollowupPrompt(language),
          // Gemini rejects requests that end on a model turn, so close with a user nudge.
          messages: [
            ...history,
            ...answerMessages,
            { role: "user", content: "Suggest what I might do next." },
          ],
          tools: { suggest_followups },
          toolChoice: { type: "tool", toolName: "suggest_followups" },
          stopWhen: isStepCount(1),
        });
        writer.merge(toUIMessageStream({ stream: followups.stream, sendStart: false }));
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    return errorResponse(err);
  }
}
