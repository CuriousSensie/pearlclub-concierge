import { describe, expect, it, vi } from "vitest";
import { SESSION, jsonRequest } from "../../../../tests/helpers/http";

vi.mock("@/server/http/rateLimit", () => ({
  enforceWriteLimit: vi.fn(async () => {}),
  enforceReadLimit: vi.fn(async () => {}),
}));
vi.mock("@/server/db/profiles", () => ({ getProfile: vi.fn(), replaceProfile: vi.fn() }));

import { getProfile, replaceProfile } from "@/server/db/profiles";
import { GET, POST } from "./route";

const post = (body: unknown) => POST(jsonRequest("http://x/api/profile", "POST", body));

describe("/api/profile", () => {
  it("returns the stored profile or null", async () => {
    vi.mocked(getProfile).mockResolvedValue(null);
    expect(
      (await (await GET(jsonRequest("http://x/api/profile", "GET"))).json()).profile,
    ).toBeNull();
  });

  it("saves a valid preferences patch for the session", async () => {
    vi.mocked(replaceProfile).mockResolvedValue({ session_id: SESSION } as never);
    const res = await post({
      travel_style: "foodie",
      budget: "mid",
      interests: ["coffee"],
      language: "es",
    });
    expect(res.status).toBe(200);
    expect(replaceProfile).toHaveBeenCalledWith(SESSION, {
      travel_style: "foodie",
      budget: "mid",
      interests: ["coffee"],
      language: "es",
    });
  });

  it.each([
    ["an unsupported language", { language: "xx" }],
    ["an invalid budget", { budget: "rich" }],
    ["too many interests", { interests: Array.from({ length: 11 }, () => "x") }],
    ["an over-long name", { name: "x".repeat(61) }],
  ])("rejects %s", async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(replaceProfile).not.toHaveBeenCalled();
  });
});
