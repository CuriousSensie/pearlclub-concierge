import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION, isoDateInDays, jsonRequest } from "../../../../tests/helpers/http";
import { makePlace } from "../../../../tests/fixtures/places";

vi.mock("@/server/http/rateLimit", () => ({
  enforceWriteLimit: vi.fn(async () => {}),
  enforceReadLimit: vi.fn(async () => {}),
}));
vi.mock("@/server/db/bookings", () => ({ createBooking: vi.fn(), listBookings: vi.fn() }));
vi.mock("@/server/db/places", () => ({ getPlacesByIds: vi.fn() }));

import { createBooking, listBookings } from "@/server/db/bookings";
import { getPlacesByIds } from "@/server/db/places";
import { HttpError } from "@/server/http/errors";
import { enforceWriteLimit } from "@/server/http/rateLimit";
import { GET, POST } from "./route";

const valid = () => ({
  idempotency_key: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  hotel_id: "kensington-house",
  booking_type: "hotel_service",
  item_id: "spa-treatment",
  item_name: "ignored",
  date: isoDateInDays(10),
  time: "15:00",
  party_size: 2,
  guest_name: "Test Guest",
  guest_email: "Guest@Example.com",
});

const post = (body: unknown, opts?: Parameters<typeof jsonRequest>[3]) =>
  POST(jsonRequest("http://x/api/bookings", "POST", body, opts));
const stored = { id: "b1", item_name: "Spa treatment" };

beforeEach(() => {
  vi.mocked(createBooking).mockResolvedValue({ booking: stored as never, replayed: false });
});

describe("POST /api/bookings", () => {
  it("creates a booking with the canonical service name and normalised email", async () => {
    const res = await post(valid());
    expect(res.status).toBe(201);
    expect((await res.json()).booking).toEqual(stored);
    expect(createBooking).toHaveBeenCalledWith(
      SESSION,
      expect.objectContaining({ guest_email: "guest@example.com", item_id: "spa-treatment" }),
      "Spa treatment",
    );
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 200 (not 201) when the same idempotency key is replayed", async () => {
    vi.mocked(createBooking).mockResolvedValue({ booking: stored as never, replayed: true });
    expect((await post(valid())).status).toBe(200);
  });

  it("books a place using the stored place name", async () => {
    vi.mocked(getPlacesByIds).mockResolvedValue([makePlace({ id: "real-place", name: "Hjem" })]);
    const res = await post({ ...valid(), booking_type: "place", item_id: "real-place" });
    expect(res.status).toBe(201);
    expect(vi.mocked(createBooking).mock.calls[0][2]).toBe("Hjem");
  });

  it.each([
    ["a missing session id", valid(), { session: null }, "x-session-id"],
    [
      "a forged counter-style session id",
      valid(),
      { session: "global:2026-10-10-abc" },
      "x-session-id",
    ],
    ["a past date", { ...valid(), date: "2020-01-01" }, undefined, "past"],
    [
      "a date more than a year ahead",
      { ...valid(), date: isoDateInDays(400) },
      undefined,
      "365 days",
    ],
    ["an impossible date", { ...valid(), date: "2030-02-31" }, undefined, "calendar"],
    ["a bad time", { ...valid(), time: "25:61" }, undefined, "HH:MM"],
    ["a bad email", { ...valid(), guest_email: "nope" }, undefined, "email"],
    ["a party of 50", { ...valid(), party_size: 50 }, undefined, "1-20"],
    [
      "a missing idempotency key",
      { ...valid(), idempotency_key: undefined },
      undefined,
      "idempotency_key",
    ],
    ["an unknown hotel", { ...valid(), hotel_id: "nowhere" }, undefined, "hotel"],
    ["an unknown hotel service", { ...valid(), item_id: "helicopter" }, undefined, "service"],
    ["a malformed item id", { ...valid(), item_id: "a,b" }, undefined, "id"],
  ])("rejects %s with 400", async (_label, body, opts, message) => {
    const res = await post(body, opts);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(message);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("rejects an unknown place", async () => {
    vi.mocked(getPlacesByIds).mockResolvedValue([]);
    const res = await post({ ...valid(), booking_type: "place", item_id: "ghost" });
    expect(res.status).toBe(400);
  });

  it("rejects non-JSON and oversized bodies", async () => {
    const bad = new Request("http://x/api/bookings", {
      method: "POST",
      headers: { "x-session-id": SESSION },
      body: "{nope",
    });
    expect((await POST(bad)).status).toBe(400);
    const huge = await post({ ...valid(), notes: "x".repeat(20_000) });
    expect(huge.status).toBe(413);
  });

  it("returns the limiter's 429", async () => {
    vi.mocked(enforceWriteLimit).mockRejectedValueOnce(
      new HttpError(429, "Request limit reached for today"),
    );
    const res = await post(valid());
    expect(res.status).toBe(429);
  });

  it("hides internal errors behind a generic 500", async () => {
    vi.mocked(createBooking).mockRejectedValue(
      new Error("connection string postgres://secret leaked"),
    );
    const res = await post(valid());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("postgres://");
    expect(text).toContain("Internal server error");
  });
});

describe("GET /api/bookings", () => {
  it("lists the session's bookings", async () => {
    vi.mocked(listBookings).mockResolvedValue([stored as never]);
    const res = await GET(jsonRequest("http://x/api/bookings", "GET"));
    expect((await res.json()).bookings).toEqual([stored]);
    expect(listBookings).toHaveBeenCalledWith(SESSION);
  });

  it("requires a session id", async () => {
    expect(
      (await GET(jsonRequest("http://x/api/bookings", "GET", undefined, { session: null }))).status,
    ).toBe(400);
  });
});
