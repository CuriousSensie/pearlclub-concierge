import { describe, expect, it } from "vitest";
import { HttpError } from "@/server/http/errors";
import { readJson, requireSessionId } from "@/server/http/guards";

const withHeaders = (headers: Record<string, string>) =>
  new Request("http://localhost/api/x", { headers });

describe("requireSessionId", () => {
  it("accepts a nanoid-style id", () => {
    expect(requireSessionId(withHeaders({ "x-session-id": "V1StGXR8_Z5jdHi6B-myT" }))).toBe(
      "V1StGXR8_Z5jdHi6B-myT",
    );
  });

  it.each([
    ["missing", {}],
    ["too short", { "x-session-id": "short" }],
    ["too long", { "x-session-id": "a".repeat(65) }],
    ["contains a colon (counter-key forgery)", { "x-session-id": "global:2026-10-10-aaaa" }],
    ["contains a space", { "x-session-id": "aaaaaaaa aaaaaaaa" }],
  ])("rejects an id that is %s", (_label, headers) => {
    expect(() => requireSessionId(withHeaders(headers))).toThrow(HttpError);
  });
});

function streamRequest(chunks: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  // `duplex` is required by Node for streamed bodies but is missing from the DOM typings.
  return new Request("http://localhost/api/x", {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit);
}

describe("readJson", () => {
  it("parses JSON within the limit", async () => {
    await expect(readJson(streamRequest(['{"a":', "1}"]), 100)).resolves.toEqual({ a: 1 });
  });

  it("enforces the cap on bytes actually received, even without Content-Length", async () => {
    const big = "x".repeat(60);
    await expect(readJson(streamRequest([`{"a":"${big}"}`]), 50)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("rejects early when the declared length is too large", async () => {
    const req = streamRequest(["{}"], { "content-length": "999999" });
    await expect(readJson(req, 100)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects invalid JSON and empty bodies", async () => {
    await expect(readJson(streamRequest(["{nope"]), 100)).rejects.toMatchObject({ status: 400 });
    await expect(readJson(new Request("http://localhost/api/x"), 100)).rejects.toMatchObject({
      status: 400,
    });
  });
});
