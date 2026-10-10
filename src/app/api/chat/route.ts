import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { getLiveContext } from "@/server/context/liveContext";
import { pickFastModel, pickModel } from "@/server/ai/model";
import { getHotel } from "@/lib/hotels";
import { LIMITS } from "@/lib/domain";
import { isLanguage } from "@/lib/i18n";
import { parseChatMessages } from "@/lib/schemas";
import { buildFollowupPrompt, buildSystemPrompt } from "@/server/ai/prompts";
import { getProfile } from "@/server/db/profiles";
import { getSavedPlaces } from "@/server/db/places";
import { HttpError, errorResponse } from "@/server/http/errors";
import { getRequestId, readJson, requireSessionId } from "@/server/http/guards";
import { enforceChatLimit } from "@/server/http/rateLimit";
import { log } from "@/server/logger";
import { createTools } from "@/server/ai/tools";

export const maxDuration = 30;

/** Keep the last N messages (starting on a user turn) and cap user text length. */
function prepareMessages(messages: UIMessage[]): UIMessage[] {
  let recent = messages.slice(-LIMITS.historyMessages);
  const firstUser = recent.findIndex((m) => m.role === "user");
  recent = firstUser > 0 ? recent.slice(firstUser) : recent;
  return recent.map((m) =>
    m.role !== "user"
      ? m
      : {
          ...m,
          parts: m.parts.map((p) =>
            p.type === "text" ? { ...p, text: p.text.slice(0, LIMITS.inputChars) } : p,
          ),
        },
  );
}

const lastUserText = (messages: UIMessage[]): string =>
  messages
    .findLast((m) => m.role === "user")
    ?.parts.map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .slice(0, 300) ?? "";

/** Plain-text digest of the assistant turn: its words plus which cards it showed. */
function summarizeTurn(messages: ModelMessage[]): string {
  const text: string[] = [];
  const tools = new Set<string>();
  for (const m of messages) {
    if (m.role !== "assistant" || typeof m.content === "string") {
      if (m.role === "assistant" && typeof m.content === "string") text.push(m.content);
      continue;
    }
    for (const part of m.content) {
      if (part.type === "text") text.push(part.text);
      if (part.type === "tool-call") tools.add(part.toolName);
    }
  }
  const shown = tools.size ? ` [shown: ${[...tools].join(", ")}]` : "";
  return `${text.join(" ").slice(0, 600)}${shown}`;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  try {
    const sessionId = requireSessionId(req);
    const body = parseChatMessages(await readJson(req, LIMITS.chatBodyBytes));
    if (!body) throw new HttpError(400, "Invalid request body");
    const { messages, hotelId, userLocation } = body;
    const language = isLanguage(body.language) ? body.language : "en";

    const hotel = getHotel(hotelId);
    // Independent lookups run together; the rate-limit check throws before any model work starts.
    const [, profile, savedPlaces, live] = await Promise.all([
      enforceChatLimit(req, sessionId),
      getProfile(sessionId),
      getSavedPlaces(sessionId),
      getLiveContext(hotel),
    ]);
    const location = userLocation ?? null;

    const { suggest_followups, ...mainTools } = createTools({
      sessionId,
      hotel,
      profile,
      savedIds: savedPlaces.map((p) => p.id),
      userLocation: location,
      rainy: live.weather?.rainy ?? false,
    });
    const model = pickModel();
    const history = await convertToModelMessages(prepareMessages(messages), { tools: mainTools });

    const stream = createUIMessageStream({
      onError: (err) => {
        log.error("chat.stream_error", { requestId, err });
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
            live,
          }),
          messages: history,
          tools: mainTools,
          maxOutputTokens: 800,
          // The plan and services cards are the answer; skip the extra model turn that would only re-describe them.
          stopWhen: [hasToolCall("plan_day"), hasToolCall("get_hotel_services"), isStepCount(6)],
        });
        writer.merge(
          toUIMessageStream({ stream: answer.stream, sendStart: false, sendFinish: false }),
        );
        const answerMessages = await answer.responseMessages;
        const [usage, steps] = await Promise.all([answer.totalUsage, answer.steps]);
        log.info("chat.turn", {
          requestId,
          session: sessionId.slice(0, 6),
          hotel: hotel.id,
          language,
          model: model.modelId,
          tools: steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)),
          usage,
          ms: Date.now() - startedAt,
        });

        // Pass 2: follow-up chips, forced so every turn has them regardless of model compliance.
        const followups = streamText({
          model: pickFastModel(),
          instructions: buildFollowupPrompt(language),
          // Short context keeps this pass fast. Providers reject a trailing model turn, so end on a user nudge.
          messages: [
            {
              role: "user",
              content: `Guest said: ${lastUserText(messages)}\nConcierge replied: ${summarizeTurn(answerMessages)}\nSuggest what the guest might do next.`,
            },
          ],
          tools: { suggest_followups },
          maxOutputTokens: 150,
          toolChoice: { type: "tool", toolName: "suggest_followups" },
          stopWhen: isStepCount(1),
        });
        writer.merge(toUIMessageStream({ stream: followups.stream, sendStart: false }));
      },
    });

    return createUIMessageStreamResponse({ stream, headers: { "x-request-id": requestId } });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
