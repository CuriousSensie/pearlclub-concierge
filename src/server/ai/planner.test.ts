import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePlace } from "../../../tests/fixtures/places";
import { HOTELS } from "@/lib/hotels";

vi.mock("@/server/search/search", () => ({ searchPlaces: vi.fn() }));
vi.mock("@/server/db/places", () => ({ getPlacesByIds: vi.fn() }));

import { getPlacesByIds } from "@/server/db/places";
import { searchPlaces } from "@/server/search/search";
import { buildPlan } from "./planner";

const hotel = HOTELS["kensington-house"];
const base = { hotel, citySlug: "london", rainy: false };

/** Places by category, laid out west to east so "nearest to the previous stop" is predictable. */
function seedCatalogue() {
  const byCategory: Record<string, ReturnType<typeof makePlace>[]> = {};
  const add = (category: string, lng: number, name: string) => {
    const place = makePlace({ category, name, lat: 51.5, lng });
    (byCategory[category] ??= []).push(place);
    return place;
  };
  const cafeNear = add("cafe", hotel.lng + 0.001, "Near cafe");
  const cafeFar = add("cafe", hotel.lng + 0.1, "Far cafe");
  const lunch = add("lunch", hotel.lng + 0.002, "Lunch spot");
  const gallery = add("arts-culture", hotel.lng + 0.003, "Gallery");
  const dinner = add("dinner", hotel.lng + 0.004, "Dinner place");
  vi.mocked(searchPlaces).mockImplementation(async (p) =>
    (byCategory[p.category ?? ""] ?? []).map((x) => ({ ...x })),
  );
  return { cafeNear, cafeFar, lunch, gallery, dinner };
}

beforeEach(() => {
  vi.mocked(getPlacesByIds).mockResolvedValue([]);
});

describe("buildPlan", () => {
  it("builds morning, lunch, afternoon and evening stops in order", async () => {
    seedCatalogue();
    const plan = await buildPlan(base);
    expect(plan.map((s) => s.time_slot)).toEqual(["morning", "lunch", "afternoon", "evening"]);
    expect(plan.map((s) => s.place.name)).toEqual([
      "Near cafe",
      "Lunch spot",
      "Gallery",
      "Dinner place",
    ]);
  });

  it("picks the candidate nearest to where the guest will be", async () => {
    const { cafeNear } = seedCatalogue();
    const plan = await buildPlan(base);
    expect(plan[0].place.id).toBe(cafeNear.id);
  });

  it("computes walking minutes from the previous stop (hotel for the first)", async () => {
    seedCatalogue();
    const plan = await buildPlan(base);
    for (const stop of plan) expect(stop.walk_min).toBeGreaterThanOrEqual(1);
    // The near cafe is about 96 m from the hotel; x1.3 street factor at 80 m/min is about 2 minutes.
    expect(plan[0].walk_min).toBe(2);
  });

  it("uses the first sentence of the description as the reason", async () => {
    const only = makePlace({
      category: "cafe",
      description: "Cozy corner cafe. Second sentence here.",
    });
    vi.mocked(searchPlaces).mockImplementation(async (p) => (p.category === "cafe" ? [only] : []));
    const [stop] = await buildPlan({ ...base, slots: ["morning"] });
    expect(stop.reason).toBe("Cozy corner cafe.");
  });

  it("keeps requested stops and does not reuse them elsewhere", async () => {
    const { cafeFar } = seedCatalogue();
    vi.mocked(getPlacesByIds).mockResolvedValue([cafeFar]);
    const plan = await buildPlan({
      ...base,
      keep: [{ time_slot: "morning", place_id: cafeFar.id }],
    });
    expect(plan[0].place.id).toBe(cafeFar.id);
    expect(plan.filter((s) => s.place.id === cafeFar.id)).toHaveLength(1);
  });

  it("avoids excluded places", async () => {
    const { cafeNear, cafeFar } = seedCatalogue();
    const plan = await buildPlan({ ...base, excludeIds: [cafeNear.id] });
    expect(plan[0].place.id).toBe(cafeFar.id);
  });

  it("looks for indoor afternoon places when it rains", async () => {
    seedCatalogue();
    await buildPlan({ ...base, rainy: true });
    const afternoonCategories = vi.mocked(searchPlaces).mock.calls.map(([p]) => p.category);
    expect(afternoonCategories).toContain("arts-culture");
    expect(afternoonCategories).not.toContain("outdoor-drinks");
  });

  it("allows outdoor afternoon places when it is dry", async () => {
    seedCatalogue();
    await buildPlan(base);
    expect(vi.mocked(searchPlaces).mock.calls.map(([p]) => p.category)).toContain("outdoor-drinks");
  });

  it("only plans the requested slots and skips slots with no candidates", async () => {
    seedCatalogue();
    const plan = await buildPlan({ ...base, slots: ["lunch", "evening"] });
    expect(plan.map((s) => s.time_slot)).toEqual(["lunch", "evening"]);

    vi.mocked(searchPlaces).mockResolvedValue([]);
    expect(await buildPlan(base)).toEqual([]);
  });
});
