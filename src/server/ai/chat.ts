import "server-only";
import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  hasToolCall,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import type { Hotel } from "@/lib/hotels";
import type { Language, Place, Profile, UserLocation } from "@/lib/types";
import type { LiveContext } from "@/server/context/liveContext";
import { log } from "@/server/logger";
import { lastUserText, prepareMessages, summarizeTurn } from "./history";
import { pickFastModel, pickModel } from "./model";
import { buildFollowupPrompt, buildSystemPrompt } from "./prompts";
import { createTools } from "./tools";

export type ConciergeTurn = {
  requestId: string;
  startedAt: number;
  sessionId: string;
  messages: UIMessage[];
  hotel: Hotel;
  language: Language;
  userLocation: UserLocation | null;
  profile: Profile | null;
  savedPlaces: Place[];
  live: LiveContext;
};

/**
 * Streams one concierge turn: pass 1 answers with the real tools; pass 2 adds follow-up chips
 * (forced, so every turn has them regardless of model compliance).
 */
export async function createConciergeStream(turn: ConciergeTurn) {
  const { requestId, hotel, language, profile, savedPlaces, live } = turn;
  const { suggest_followups, ...mainTools } = createTools({
    sessionId: turn.sessionId,
    hotel,
    profile,
    savedIds: savedPlaces.map((p) => p.id),
    userLocation: turn.userLocation,
    rainy: live.weather?.rainy ?? false,
  });
  const model = pickModel();
  const history = await convertToModelMessages(prepareMessages(turn.messages), {
    tools: mainTools,
  });

  return createUIMessageStream({
    onError: (err) => {
      log.error("chat.stream_error", { requestId, err });
      // Surface provider rate limits distinctly so the UI can say "busy" instead of "broken".
      return APICallError.isInstance(err) && err.statusCode === 429
        ? "model_busy"
        : "An error occurred.";
    },
    execute: async ({ writer }) => {
      writer.write({ type: "start" });

      const answer = streamText({
        model,
        instructions: buildSystemPrompt({
          hotel,
          profile,
          savedPlaces,
          language,
          userLocation: turn.userLocation,
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
        session: turn.sessionId.slice(0, 6),
        hotel: hotel.id,
        language,
        model: model.modelId,
        tools: steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)),
        usage,
        ms: Date.now() - turn.startedAt,
      });

      const followups = streamText({
        model: pickFastModel(),
        instructions: buildFollowupPrompt(language),
        // Short context keeps this pass fast. Providers reject a trailing model turn, so end on a user nudge.
        messages: [
          {
            role: "user",
            content: `Guest said: ${lastUserText(turn.messages)}\nConcierge replied: ${summarizeTurn(answerMessages)}\nSuggest what the guest might do next.`,
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
}
