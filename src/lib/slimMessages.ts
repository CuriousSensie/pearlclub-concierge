import type { UIMessage } from "ai";

/** Only the most recent turns are sent; the server also caps history. */
const MAX_MESSAGES = 14;
const MAX_DESCRIPTION = 200;

// Fields the model never reads back from earlier tool results (images, links, coordinates...).
const DROP_KEYS = new Set([
  "image_url",
  "curator_image",
  "curator_slug",
  "curator_type",
  "pearlclub_url",
  "tags",
  "neighborhood",
  "city",
  "lat",
  "lng",
]);

function slimValue(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map((v) => slimValue(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !DROP_KEYS.has(k))
        .map(([k, v]) => [k, slimValue(v, k)]),
    );
  }
  if (key === "description" && typeof value === "string") return value.slice(0, MAX_DESCRIPTION);
  return value;
}

/**
 * Shrinks the conversation before it is sent back to the server. Earlier tool results carry full
 * place records for the UI; the server rebuilds a compact view for the model, so the heavy fields
 * (photos, links, coordinates) only inflate the request and can trip the body-size limit.
 */
export function slimMessages(messages: UIMessage[]): UIMessage[] {
  return messages.slice(-MAX_MESSAGES).map((m) =>
    m.role !== "assistant"
      ? m
      : {
          ...m,
          // Only `output` changes; the cast spares restating the SDK's large per-tool part union.
          parts: m.parts.map((p) =>
            p.type.startsWith("tool-") && "output" in p ? { ...p, output: slimValue(p.output) } : p,
          ) as UIMessage["parts"],
        },
  );
}
