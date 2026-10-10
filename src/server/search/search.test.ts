import { describe, expect, it, vi } from "vitest";
import { makePlace } from "../../../tests/fixtures/places";
import { keywords, searchPlaces, type SearchDeps } from "./search";

vi.mock("@/server/db/places", () => ({ listCityPlaces: vi.fn() }));
vi.mock("./vector", () => ({ vectorMatches: vi.fn() }));

const noVectors = async () => null;
const deterministic = () => 0.5;

const depsFor = (
  places: ReturnType<typeof makePlace>[],
  vector: SearchDeps["vector"] = noVectors,
): SearchDeps => ({ cityPlaces: async () => places, vector });

const search = (
  places: ReturnType<typeof makePlace>[],
  params: Partial<Parameters<typeof searchPlaces>[0]> = {},
  vector?: SearchDeps["vector"],
) =>
  searchPlaces(
    { city_slug: "london", limit: 6, random: deterministic, ...params },
    depsFor(places, vector),
  );

describe("keywords", () => {
  it("drops stopwords and short words, keeps letters and digits", () => {
    expect(keywords("Hidden gems with natural wine, near me!")).toEqual(["natural", "wine"]);
  });

  it("keeps non-latin letters and caps at six", () => {
    expect(keywords("café ñandú müsli bücher sushi ramen tacos extra")).toHaveLength(6);
    expect(keywords("café")).toEqual(["café"]);
  });

  it("returns nothing for empty or missing input", () => {
    expect(keywords(undefined)).toEqual([]);
    expect(keywords("   ")).toEqual([]);
  });
});

describe("searchPlaces filters", () => {
  const cafe = makePlace({ category: "cafe", price_level: 1 });
  const bar = makePlace({ category: "bar", price_level: 3 });

  it("filters by category and price", async () => {
    expect((await search([cafe, bar], { category: "bar" })).map((p) => p.id)).toEqual([bar.id]);
    expect((await search([cafe, bar], { price_max: 1 })).map((p) => p.id)).toEqual([cafe.id]);
  });

  it("never returns excluded places and ignores malformed excluded ids", async () => {
    const result = await search([cafe, bar], { excludeIds: [cafe.id, "a),b"] });
    expect(result.map((p) => p.id)).toEqual([bar.id]);
  });

  it("falls back to ignoring tags when none match", async () => {
    const result = await search([cafe], { tags: ["splurge"] });
    expect(result.map((p) => p.id)).toEqual([cafe.id]);
  });

  it("filters by tags when some match", async () => {
    const tagged = makePlace({ tags: ["budget"] });
    const result = await search([cafe, tagged], { tags: ["budget"] });
    expect(result.map((p) => p.id)).toEqual([tagged.id]);
  });

  it("respects the limit and returns an empty list for an empty city", async () => {
    const many = Array.from({ length: 10 }, () => makePlace());
    expect(await search(many, { limit: 3 })).toHaveLength(3);
    expect(await search([])).toEqual([]);
  });
});

describe("searchPlaces ranking", () => {
  it("ranks keyword matches first and tops up from the rest when matches are scarce", async () => {
    const match = makePlace({ description: "Great natural wine list" });
    const others = Array.from({ length: 4 }, () => makePlace());
    const result = await search([...others, match], { query: "natural wine", limit: 3 });
    expect(result[0].id).toBe(match.id);
    expect(result).toHaveLength(3);
  });

  it("sorts by distance when a location is known", async () => {
    const near = makePlace({ lat: 51.5, lng: -0.12 });
    const far = makePlace({ lat: 51.6, lng: -0.3 });
    const result = await search([far, near], { near: { lat: 51.5, lng: -0.12 } });
    expect(result.map((p) => p.id)).toEqual([near.id, far.id]);
    expect(result[0].distance_km).toBe(0);
    expect(result[1].distance_km).toBeGreaterThan(10);
  });

  it("lets a much better semantic match outrank a slightly closer place", async () => {
    const closer = makePlace({ lat: 51.5, lng: -0.12 });
    const better = makePlace({ lat: 51.51, lng: -0.12 }); // about 1.1 km further
    const vector = async () =>
      new Map([
        [closer.id, 0.1],
        [better.id, 0.9],
      ]);
    const result = await search(
      [closer, better],
      { query: "cozy", near: { lat: 51.5, lng: -0.12 } },
      vector,
    );
    expect(result[0].id).toBe(better.id);
  });

  it("uses vector similarity order when available, and only returns matched places", async () => {
    const a = makePlace();
    const b = makePlace();
    const c = makePlace();
    const vector = async () =>
      new Map([
        [a.id, 0.3],
        [b.id, 0.8],
      ]);
    const result = await search([a, b, c], { query: "romantic dinner" }, vector);
    expect(result.map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it("boosts places matching the guest's interests", async () => {
    const plain = makePlace({ description: "A shop" });
    const loved = makePlace({ description: "Specialty coffee bar" });
    const result = await search([plain, loved], { interests: ["coffee"] });
    expect(result[0].id).toBe(loved.id);
  });

  it("is deterministic for a given random source", async () => {
    const places = Array.from({ length: 8 }, () => makePlace());
    const first = (await search(places)).map((p) => p.id);
    const second = (await search(places)).map((p) => p.id);
    expect(first).toEqual(second);
  });
});
