import "server-only";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { env } from "@/server/env";

/** True when OpenAI is configured; embeddings (vibe search) are only available then. */
export const hasOpenAI = (): boolean => Boolean(env().OPENAI_API_KEY);

/**
 * Picks the model for one chat turn.
 * - OpenAI configured -> OpenAI, model from OPENAI_MODEL.
 * - otherwise         -> Gemini, random pick from AI_MODELS (free-tier quotas are per model,
 *                        so rotating across several raises the requests-per-minute ceiling).
 */
export function pickModel() {
  const e = env();
  if (e.OPENAI_API_KEY && e.OPENAI_MODEL) return openai(e.OPENAI_MODEL);

  const ids = (e.AI_MODELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return google(ids[Math.floor(Math.random() * ids.length)]);
}

/** Small, quick model for short structured jobs such as follow-up chips. */
export function pickFastModel() {
  const e = env();
  if (e.OPENAI_API_KEY) return openai(e.OPENAI_FAST_MODEL ?? "gpt-4.1-nano");
  return pickModel();
}
