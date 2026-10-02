import "server-only";
import { google } from "@ai-sdk/google";

/**
 * Picks a model for one chat turn. AI_MODELS is a comma-separated list; free-tier quotas are per
 * model, so rotating across several raises the requests-per-minute ceiling. Falls back to AI_MODEL.
 */
export function pickModel() {
  const ids = (process.env.AI_MODELS ?? process.env.AI_MODEL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) throw new Error("AI_MODELS (or AI_MODEL) is not configured");
  return google(ids[Math.floor(Math.random() * ids.length)]);
}
