import { describe, expect, it } from "vitest";
import { classifyChatError } from "./chatError";

describe("classifyChatError", () => {
  it.each([
    ["Demo limit reached for today", "daily"],
    ["The demo has reached its daily limit", "daily"],
    ["Demo limit reached for this session", "limit"],
    ["HTTP 429", "limit"],
    ["model_busy", "busy"],
    ["An error occurred.", "generic"],
    ["", "generic"],
    [undefined, "generic"],
  ])("%j -> %s", (message, kind) => {
    expect(classifyChatError(message)).toBe(kind);
  });
});
