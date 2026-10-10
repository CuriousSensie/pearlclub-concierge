import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({ env: vi.fn() }));

import { env } from "../env";
import { requireCronAuth } from "./cron";

const SECRET = "0123456789abcdef-secret";
const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/purge", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.mocked(env).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof env>);
});

describe("requireCronAuth", () => {
  it("accepts the correct bearer token", () => {
    expect(() => requireCronAuth(request(`Bearer ${SECRET}`))).not.toThrow();
  });

  it.each([
    ["missing header", undefined],
    ["wrong token", "Bearer nope"],
    ["wrong scheme", `Basic ${SECRET}`],
    ["same length, different value", `Bearer ${"x".repeat(SECRET.length)}`],
  ])("rejects %s with 401", (_label, header) => {
    expect(() => requireCronAuth(request(header))).toThrowError(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("is disabled (503) when no secret is configured", () => {
    vi.mocked(env).mockReturnValue({ CRON_SECRET: undefined } as ReturnType<typeof env>);
    expect(() => requireCronAuth(request(`Bearer ${SECRET}`))).toThrowError(
      expect.objectContaining({ status: 503 }),
    );
  });
});
