import { describe, expect, it } from "vitest";
import { HttpError, errorResponse } from "./errors";

describe("errorResponse", () => {
  it("returns an HttpError's own message and status, with the request id", async () => {
    const res = errorResponse(new HttpError(429, "Slow down"), "req-1");
    expect(res.status).toBe(429);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(await res.json()).toEqual({ error: "Slow down", requestId: "req-1" });
  });

  it("keeps an intentional 5xx status (for example a disabled feature)", async () => {
    const res = errorResponse(new HttpError(503, "Cron is not configured"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Cron is not configured");
  });

  it("masks unexpected errors behind a generic 500 and never leaks details", async () => {
    const res = errorResponse(new Error("password=hunter2 at db.internal:5432"), "req-2");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("Internal server error");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("db.internal");
  });

  it("handles non-Error throwables", async () => {
    expect(errorResponse("boom").status).toBe(500);
    expect(errorResponse(undefined).status).toBe(500);
  });
});
