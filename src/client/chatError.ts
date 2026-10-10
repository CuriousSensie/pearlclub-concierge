export type ChatErrorKind = "daily" | "limit" | "busy" | "generic";

/**
 * Classifies a failed chat request from the text the server sent back. The server uses fixed
 * phrases for its limits ("...for this session", "...for today", "daily limit") and "model_busy"
 * when the model provider is rate limited.
 */
export function classifyChatError(message: string | undefined): ChatErrorKind {
  const text = (message ?? "").toLowerCase();
  if (/today|daily limit/.test(text)) return "daily";
  if (text.includes("429") || text.includes("demo limit")) return "limit";
  if (text.includes("model_busy")) return "busy";
  return "generic";
}
