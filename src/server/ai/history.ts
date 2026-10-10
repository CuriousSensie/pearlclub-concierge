import type { ModelMessage, UIMessage } from "ai";
import { LIMITS } from "@/lib/domain";

/** Keeps the last N messages (starting on a user turn) and caps the length of user text. */
export function prepareMessages(messages: UIMessage[]): UIMessage[] {
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

/** The text of the guest's latest message (capped), for the follow-up pass. */
export const lastUserText = (messages: UIMessage[]): string =>
  messages
    .findLast((m) => m.role === "user")
    ?.parts.map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .slice(0, 300) ?? "";

/** Plain-text digest of the assistant turn: its words plus which cards it showed. */
export function summarizeTurn(messages: ModelMessage[]): string {
  const text: string[] = [];
  const tools = new Set<string>();
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    if (typeof m.content === "string") {
      text.push(m.content);
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
