import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({ env: vi.fn(() => ({ CRON_SECRET: "0123456789abcdef-secret" })) }));
vi.mock("@/server/db/maintenance", () => ({
  purgeExpired: vi.fn(async () => ({ usage: 3, bookings: 1 })),
}));

import { purgeExpired } from "@/server/db/maintenance";
import { GET } from "./route";

const call = (auth?: string) =>
  GET(new Request("http://x/api/cron/purge", { headers: auth ? { authorization: auth } : {} }));

describe("GET /api/cron/purge", () => {
  it("rejects callers without the secret and does not purge", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });

  it("purges and reports counts for Vercel Cron", async () => {
    const res = await call("Bearer 0123456789abcdef-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: { usage: 3, bookings: 1 } });
  });
});
