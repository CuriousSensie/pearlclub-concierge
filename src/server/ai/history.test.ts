import type { ModelMessage, UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/domain";
import { lastUserText, prepareMessages, summarizeTurn } from "./history";

const user = (text: string, id = "u"): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});
const assistant = (text: string, id = "a"): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "text", text }],
});

describe("prepareMessages", () => {
  it("keeps the last N messages and starts on a user turn", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      i % 2 === 0 ? user(`q${i}`, `u${i}`) : assistant(`a${i}`, `a${i}`),
    );
    const prepared = prepareMessages(many);
    expect(prepared.length).toBeLessThanOrEqual(LIMITS.historyMessages);
    expect(prepared[0].role).toBe("user");
  });

  it("truncates long user text but leaves assistant text alone", () => {
    const long = "x".repeat(LIMITS.inputChars + 500);
    const [u, a] = prepareMessages([user(long), assistant(long)]);
    expect((u.parts[0] as { text: string }).text).toHaveLength(LIMITS.inputChars);
    expect((a.parts[0] as { text: string }).text).toHaveLength(long.length);
  });
});

describe("lastUserText", () => {
  it("returns the latest user message, capped", () => {
    expect(lastUserText([user("first"), assistant("ok"), user("second")])).toBe("second");
    expect(lastUserText([user("y".repeat(900))])).toHaveLength(300);
    expect(lastUserText([assistant("only assistant")])).toBe("");
  });
});

describe("summarizeTurn", () => {
  it("joins assistant text and lists the tools that produced cards", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Here you go." },
          { type: "tool-call", toolCallId: "t", toolName: "search_places", input: {} },
        ],
      },
      { role: "tool", content: [] },
    ];
    expect(summarizeTurn(messages)).toBe("Here you go. [shown: search_places]");
  });

  it("handles string content, no tools, and caps the text", () => {
    expect(summarizeTurn([{ role: "assistant", content: "plain" }])).toBe("plain");
    expect(summarizeTurn([{ role: "assistant", content: "z".repeat(900) }])).toHaveLength(600);
  });
});
