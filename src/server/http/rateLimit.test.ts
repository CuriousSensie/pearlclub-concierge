import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/usage", () => ({ incrementUsage: vi.fn() }));
vi.mock("../env", () => ({ env: vi.fn() }));

import { incrementUsage } from "@/server/db/usage";
import { env } from "@/server/env";
import {
  enforceChatLimit,
  enforceLookupLimit,
  enforceReadLimit,
  enforceWriteLimit,
  resetReadLimiter,
} from "@/server/http/rateLimit";

const baseEnv = {
  NODE_ENV: "production",
  ENFORCE_DAILY_LIMITS: undefined,
  MAX_MESSAGES_PER_SESSION: 3,
  MAX_MESSAGES_PER_IP_PER_DAY: 5,
  MAX_MESSAGES_PER_DAY: 7,
  MAX_LOOKUPS_PER_IP_PER_DAY: 2,
  MAX_WRITES_PER_IP_PER_DAY: 2,
};

const request = (ip = "203.0.113.7") =>
  new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip } });

let counters: Map<string, number>;

beforeEach(() => {
  counters = new Map();
  vi.mocked(env).mockReturnValue(baseEnv as ReturnType<typeof env>);
  vi.mocked(incrementUsage).mockImplementation(async (key) => {
    counters.set(key, (counters.get(key) ?? 0) + 1);
    return counters.get(key) as number;
  });
  resetReadLimiter();
});

describe("enforceChatLimit", () => {
  it("rejects a session after its cap", async () => {
    const session = "session-aaaaaaaaaaaa";
    for (let i = 0; i < 3; i++) await enforceChatLimit(request(), session);
    await expect(enforceChatLimit(request(), session)).rejects.toMatchObject({ status: 429 });
  });

  it("namespaces keys so a session id can never touch the global counter", async () => {
    // Regression: a client-chosen id equal to the global key used to inflate the demo-wide counter.
    const day = new Date().toISOString().slice(0, 10);
    await enforceChatLimit(request(), `g:${day}`);
    expect(counters.get(`s:g:${day}`)).toBe(1);
    // Only the genuine global counter, bumped once by this request, exists under that key.
    expect(counters.get(`g:${day}`)).toBe(1);
    await enforceChatLimit(request("198.51.100.1"), "other-session-aaaaaa");
    expect(counters.get(`g:${day}`)).toBe(2);
  });

  it("stops at the IP budget before touching the global counter", async () => {
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 5; i++) await enforceChatLimit(request(), `session-${i}-aaaaaaaaaaaa`);
    await expect(enforceChatLimit(request(), "session-x-aaaaaaaaaaaa")).rejects.toMatchObject({
      status: 429,
      message: "Demo limit reached for today",
    });
    expect(counters.get(`g:${day}`)).toBe(5);
  });

  it("enforces the whole-demo daily cap across IPs", async () => {
    for (let i = 0; i < 7; i++)
      await enforceChatLimit(request(`10.0.0.${i}`), `session-${i}-aaaaaaaaaaaa`);
    await expect(
      enforceChatLimit(request("10.0.0.99"), "session-z-aaaaaaaaaaaa"),
    ).rejects.toMatchObject({
      message: "The demo has reached its daily limit",
    });
  });

  it("skips daily caps in development unless ENFORCE_DAILY_LIMITS is set", async () => {
    vi.mocked(env).mockReturnValue({ ...baseEnv, NODE_ENV: "development" } as ReturnType<
      typeof env
    >);
    await enforceChatLimit(request(), "session-dev-aaaaaaaaaaa");
    expect([...counters.keys()].some((k) => k.startsWith("ip:") || k.startsWith("g:"))).toBe(false);

    vi.mocked(env).mockReturnValue({
      ...baseEnv,
      NODE_ENV: "development",
      ENFORCE_DAILY_LIMITS: "true",
    } as ReturnType<typeof env>);
    await enforceChatLimit(request(), "session-dev-bbbbbbbbbbb");
    expect([...counters.keys()].some((k) => k.startsWith("ip:"))).toBe(true);
  });

  it("does not store the raw IP address", async () => {
    await enforceChatLimit(request("203.0.113.7"), "session-priv-aaaaaaaaa");
    expect([...counters.keys()].some((k) => k.includes("203.0.113.7"))).toBe(false);
  });
});

describe("write and lookup limits", () => {
  it("caps writes per IP per day", async () => {
    await enforceWriteLimit(request());
    await enforceWriteLimit(request());
    await expect(enforceWriteLimit(request())).rejects.toMatchObject({ status: 429 });
    await expect(enforceWriteLimit(request("198.51.100.2"))).resolves.toBeUndefined();
  });

  it("caps lookups per IP per day", async () => {
    await enforceLookupLimit(request());
    await enforceLookupLimit(request());
    await expect(enforceLookupLimit(request())).rejects.toMatchObject({ status: 429 });
  });
});

describe("enforceReadLimit (in-memory burst limiter)", () => {
  it("allows a burst up to the limit then rejects, and recovers after the window", async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 120; i++) await enforceReadLimit(request(), t0);
    await expect(enforceReadLimit(request(), t0)).rejects.toMatchObject({ status: 429 });
    await expect(enforceReadLimit(request(), t0 + 61_000)).resolves.toBeUndefined();
  });

  it("never calls the database", async () => {
    await enforceReadLimit(request());
    expect(incrementUsage).not.toHaveBeenCalled();
  });
});
