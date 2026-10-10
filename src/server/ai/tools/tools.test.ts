import type { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePlace } from "../../../../tests/fixtures/places";
import { HOTELS } from "@/lib/hotels";
import { TOOL_NAMES } from "@/lib/domain";

vi.mock("@/server/db/places", () => ({ getPlacesByIds: vi.fn() }));
vi.mock("@/server/search/search", () => ({ searchPlaces: vi.fn() }));
vi.mock("@/server/db/profiles", () => ({ upsertProfile: vi.fn() }));
vi.mock("@/server/ai/planner", () => ({ buildPlan: vi.fn() }));

import { buildPlan } from "@/server/ai/planner";
import { getPlacesByIds } from "@/server/db/places";
import { searchPlaces } from "@/server/search/search";
import { createTools, type ToolContext } from "./index";

const ctx: ToolContext = {
  sessionId: "V1StGXR8_Z5jdHi6B-myT",
  hotel: HOTELS["kensington-house"],
  profile: null,
  savedIds: ["saved-1"],
  userLocation: null,
  rainy: false,
};
const tools = () => createTools(ctx);
const options = { toolCallId: "t1", messages: [] } as never;

// The SDK types make `execute` and the schema generic and optional; tests exercise them directly.
type AnyTool = {
  execute?: (input: never, o: never) => Promise<unknown>;
  inputSchema: z.ZodType;
  toModelOutput?: (a: { output: never }) => { value: unknown };
};
const run = (name: (typeof TOOL_NAMES)[number], input: unknown) =>
  (tools()[name] as unknown as AnyTool).execute!(input as never, options);
const schemaOf = (name: (typeof TOOL_NAMES)[number]) =>
  (tools()[name] as unknown as AnyTool).inputSchema;

beforeEach(() => {
  vi.mocked(getPlacesByIds).mockResolvedValue([]);
});

describe("createTools", () => {
  it("exposes exactly the tool names the rest of the app relies on", () => {
    expect(Object.keys(tools()).sort()).toEqual([...TOOL_NAMES].sort());
  });
});

describe("input schemas reject ids that could alter a query filter", () => {
  it.each([
    ["get_place_details", { place_id: "a,b" }],
    ["show_map", { place_ids: ["ok-id", "a)"] }],
    ["propose_booking", { booking_type: "place", item_id: "x y", item_name: "x" }],
    ["plan_day", { exclude_ids: ["a),category.eq.x"] }],
    ["plan_day", { keep: [{ time_slot: "morning", place_id: "a.b" }] }],
  ] as const)("%s", (name, input) => {
    expect(schemaOf(name).safeParse(input).success).toBe(false);
  });

  it("accepts well-formed input", () => {
    expect(
      schemaOf("search_places").safeParse({ category: "cafe", query: "natural wine", limit: 5 })
        .success,
    ).toBe(true);
    expect(schemaOf("search_places").safeParse({ category: "not-a-category" }).success).toBe(false);
    expect(schemaOf("plan_day").safeParse({ vibe: "quiet", slots: ["lunch"] }).success).toBe(true);
  });
});

describe("propose_booking", () => {
  it("builds a form for a hotel service using the canonical English name", async () => {
    const result = (await run("propose_booking", {
      booking_type: "hotel_service",
      item_id: "spa-treatment",
      item_name: "whatever the model said",
      suggested_date: "2030-01-01",
    })) as { form: Record<string, unknown> };
    expect(result.form).toMatchObject({
      item_name: "Spa treatment",
      hotel_id: "kensington-house",
      requires_time: true,
      suggested_date: "2030-01-01",
    });
  });

  it("rejects an unknown service and lists the valid ids", async () => {
    const result = (await run("propose_booking", {
      booking_type: "hotel_service",
      item_id: "helicopter",
      item_name: "x",
    })) as { error: string };
    expect(result.error).toContain("spa-treatment");
  });

  it("uses the stored place for place bookings, and rejects unknown places", async () => {
    const place = makePlace({ id: "real-place", name: "Hjem" });
    vi.mocked(getPlacesByIds).mockResolvedValueOnce([place]);
    const ok = (await run("propose_booking", {
      booking_type: "place",
      item_id: "real-place",
      item_name: "wrong name",
    })) as { form: Record<string, unknown> };
    expect(ok.form).toMatchObject({ item_name: "Hjem", pearlclub_url: place.pearlclub_url });

    const missing = (await run("propose_booking", {
      booking_type: "place",
      item_id: "ghost",
      item_name: "x",
    })) as { error: string };
    expect(missing.error).toMatch(/Unknown place/);
  });
});

describe("what the model sees", () => {
  it("search_places gives a compact view without images, coordinates or curator photos", () => {
    const place = makePlace({ id: "p1", name: "Hjem", description: "d".repeat(400) });
    const view = (tools().search_places as unknown as AnyTool).toModelOutput!({
      output: { places: [{ ...place, distance_km: 0.5 }] } as never,
    }).value as { places: Record<string, unknown>[] };
    const [compact] = view.places;
    expect(compact).toMatchObject({
      id: "p1",
      name: "Hjem",
      recommended_by: "Sienna L.",
      distance_km: 0.5,
    });
    expect((compact.about as string).length).toBe(180);
    for (const hidden of ["image_url", "lat", "lng", "curator_image", "pearlclub_url", "tags"]) {
      expect(compact).not.toHaveProperty(hidden);
    }
  });

  it("plan_day keeps ids and slots so the model can swap a stop, but nothing heavy", async () => {
    const stop = {
      time_slot: "morning",
      place: makePlace({ id: "p1", name: "Hjem" }),
      reason: "r",
      walk_min: 3,
    };
    vi.mocked(buildPlan).mockResolvedValue([stop] as never);
    const output = await run("plan_day", { theme: "Day" });
    const view = (tools().plan_day as unknown as AnyTool).toModelOutput!({
      output: output as never,
    }).value as { plan: Record<string, unknown>[] };
    expect(view.plan[0]).toEqual({
      slot: "morning",
      id: "p1",
      name: "Hjem",
      category: "cafe",
      recommended_by: "Sienna L.",
      walk_min: 3,
    });
  });

  it("hotel services are described in English with a price", async () => {
    const output = await run("get_hotel_services", {});
    const view = (tools().get_hotel_services as unknown as AnyTool).toModelOutput!({
      output: output as never,
    }).value as { id: string; name: string; description: string; price: string }[];
    const transfer = view.find((s) => s.id === "airport-transfer")!;
    expect(transfer.name).toBe("Airport transfer");
    expect(transfer.description).toContain("Heathrow");
    expect(transfer.price).toBe("from EUR 65");
    expect(view.find((s) => s.id === "restaurant-reservation")!.price).toBe("complimentary");
  });
});

describe("search_places execution", () => {
  it("defaults to the hotel's city, excludes saved places and passes interests", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    await run("search_places", { query: "cozy" });
    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ city_slug: "london", excludeIds: ["saved-1"], limit: 6 }),
    );
  });

  it("falls back to the hotel's city for an invented city and includes saved places when asked", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    await run("search_places", { city_slug: "atlantis", include_saved: true });
    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ city_slug: "london", excludeIds: [] }),
    );
  });
});

describe("plan_day execution", () => {
  it("reports when no places could be found", async () => {
    vi.mocked(buildPlan).mockResolvedValue([]);
    expect(await run("plan_day", {})).toEqual({ error: "No places found for that plan" });
  });

  it("returns the plan with the weather flag", async () => {
    vi.mocked(buildPlan).mockResolvedValue([
      { time_slot: "lunch", place: makePlace(), reason: "", walk_min: 1 },
    ] as never);
    const out = (await run("plan_day", { theme: "My day" })) as {
      rainy: boolean;
      theme: string;
      city_slug: string;
    };
    expect(out).toMatchObject({ rainy: false, theme: "My day", city_slug: "london" });
  });
});
