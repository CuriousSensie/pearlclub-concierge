import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "../../../../tests/helpers/http";

vi.mock("@/server/http/rateLimit", () => ({
  enforceReadLimit: vi.fn(async () => {}),
  enforceLookupLimit: vi.fn(async () => {}),
}));
vi.mock("@/server/context/liveContext", () => ({
  getLiveContext: vi.fn(async () => ({
    partOfDay: "evening",
    weekday: "Friday",
    localTime: "t",
    weather: { tempC: 16, sky: "clear", rainy: false, description: "clear" },
  })),
}));
vi.mock("@/server/context/rails", () => ({ buildRails: vi.fn(async () => []) }));
vi.mock("@/server/context/geocode", () => ({ areaName: vi.fn(async () => "Brompton") }));

import { areaName } from "@/server/context/geocode";
import { HttpError } from "@/server/http/errors";
import { enforceLookupLimit } from "@/server/http/rateLimit";
import { GET } from "./route";

const get = (query: string) =>
  GET(jsonRequest(`http://x/api/discover?${query}`, "GET", undefined, { session: null }));

describe("GET /api/discover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the hotel's city without any geocoding when no location is given", async () => {
    const body = await (await get("hotel=kensington-house")).json();
    expect(body.context.location).toEqual({ label: "London", shared: false });
    expect(areaName).not.toHaveBeenCalled();
    expect(enforceLookupLimit).not.toHaveBeenCalled();
  });

  it("labels the guest's neighbourhood when they are near the hotel", async () => {
    const body = await (await get("hotel=kensington-house&lat=51.4967&lng=-0.1764")).json();
    expect(body.context.location).toEqual({ label: "Brompton, London", shared: true });
    expect(enforceLookupLimit).toHaveBeenCalledTimes(1);
  });

  it("ignores a location far from the hotel", async () => {
    const body = await (await get("hotel=kensington-house&lat=48.8566&lng=2.3522")).json();
    expect(body.context.location.shared).toBe(false);
    expect(areaName).not.toHaveBeenCalled();
  });

  it("ignores invalid or incomplete coordinates without calling the geocoder", async () => {
    for (const q of ["lat=999&lng=0", "lat=abc&lng=1", "lat=51.5"]) {
      const res = await get(`hotel=kensington-house&${q}`);
      expect(res.status).toBe(200);
    }
    expect(areaName).not.toHaveBeenCalled();
  });

  it("is limited per client for geocoded lookups", async () => {
    vi.mocked(enforceLookupLimit).mockRejectedValueOnce(
      new HttpError(429, "Lookup limit reached for today"),
    );
    expect((await get("hotel=kensington-house&lat=51.4967&lng=-0.1764")).status).toBe(429);
  });

  it("falls back to the default hotel for an unknown id", async () => {
    expect((await (await get("hotel=nowhere")).json()).context.location.label).toBe("London");
  });
});
