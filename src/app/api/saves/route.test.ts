import { describe, expect, it, vi } from "vitest";
import { SESSION, jsonRequest } from "../../../../tests/helpers/http";
import { makePlace } from "../../../../tests/fixtures/places";

vi.mock("@/server/http/rateLimit", () => ({
  enforceWriteLimit: vi.fn(async () => {}),
  enforceReadLimit: vi.fn(async () => {}),
}));
vi.mock("@/server/db/places", () => ({ getPlacesByIds: vi.fn() }));
vi.mock("@/server/db/saves", () => ({
  getSavedPlaces: vi.fn(),
  savePlaces: vi.fn(),
  removeSavedPlace: vi.fn(),
}));

import { getPlacesByIds } from "@/server/db/places";
import { getSavedPlaces, removeSavedPlace, savePlaces } from "@/server/db/saves";
import { DELETE, GET, POST } from "./route";

describe("/api/saves", () => {
  it("lists saved places", async () => {
    const place = makePlace();
    vi.mocked(getSavedPlaces).mockResolvedValue([place]);
    const res = await GET(jsonRequest("http://x/api/saves", "GET"));
    expect((await res.json()).places).toEqual([place]);
  });

  it("saves one or many existing places", async () => {
    const a = makePlace({ id: "place-a" });
    const b = makePlace({ id: "place-b" });
    vi.mocked(getPlacesByIds).mockResolvedValue([a, b]);
    const res = await POST(
      jsonRequest("http://x/api/saves", "POST", { place_ids: ["place-a", "place-b", "place-a"] }),
    );
    expect(res.status).toBe(201);
    expect(savePlaces).toHaveBeenCalledWith(SESSION, ["place-a", "place-b"]);
  });

  it("rejects unknown places, malformed ids and empty requests", async () => {
    vi.mocked(getPlacesByIds).mockResolvedValue([]);
    expect(
      (await POST(jsonRequest("http://x/api/saves", "POST", { place_id: "ghost" }))).status,
    ).toBe(400);
    expect(
      (await POST(jsonRequest("http://x/api/saves", "POST", { place_id: "a),category.eq.x" })))
        .status,
    ).toBe(400);
    expect((await POST(jsonRequest("http://x/api/saves", "POST", {}))).status).toBe(400);
    expect(savePlaces).not.toHaveBeenCalled();
  });

  it("removes a saved place and validates the id", async () => {
    expect(
      (await DELETE(jsonRequest("http://x/api/saves?place_id=place-a", "DELETE"))).status,
    ).toBe(200);
    expect(removeSavedPlace).toHaveBeenCalledWith(SESSION, "place-a");
    expect((await DELETE(jsonRequest("http://x/api/saves?place_id=a,b", "DELETE"))).status).toBe(
      400,
    );
    expect((await DELETE(jsonRequest("http://x/api/saves", "DELETE"))).status).toBe(400);
  });

  it("requires a valid session id", async () => {
    expect(
      (await GET(jsonRequest("http://x/api/saves", "GET", undefined, { session: "short" }))).status,
    ).toBe(400);
  });
});
