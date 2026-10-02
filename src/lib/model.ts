import "server-only";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

/**
 * Picks the model for one chat turn.
 * - OPENAI_API_KEY set  -> OpenAI, model from OPENAI_MODEL.
 * - otherwise           -> Gemini, random pick from AI_MODELS (free-tier quotas are per model,
 *                          so rotating across several raises the requests-per-minute ceiling).
 */
export function pickModel() {
  if (process.env.OPENAI_API_KEY) {
    const id = process.env.OPENAI_MODEL?.trim();
    if (!id) throw new Error("OPENAI_MODEL is not configured");
    return openai(id);
  }
  const ids = (process.env.AI_MODELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) throw new Error("Set OPENAI_API_KEY + OPENAI_MODEL, or AI_MODELS for Gemini");
  return google(ids[Math.floor(Math.random() * ids.length)]);
}

/** Small, quick model for short structured jobs such as follow-up chips. */
export function pickFastModel() {
  if (process.env.OPENAI_API_KEY)
    return openai(process.env.OPENAI_FAST_MODEL?.trim() || "gpt-4.1-nano");
  return pickModel();
}
