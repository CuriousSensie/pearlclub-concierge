import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/domain";
import { idSchema } from "@/lib/schemas";
import type { Place } from "@/lib/types";

const root = resolve(__dirname, "..");
const places: Place[] = JSON.parse(
  readFileSync(resolve(root, "scraper/output/places.json"), "utf8"),
);

describe("scraped dataset (scraper/output/places.json)", () => {
  it("has enough places across the covered cities", () => {
    expect(places.length).toBeGreaterThanOrEqual(250);
    const citiesPresent = new Set(places.map((p) => p.city_slug));
    for (const city of CITIES) expect(citiesPresent.has(city.slug), city.slug).toBe(true);
  });

  it("only uses known categories and cities", () => {
    const categories = new Set<string>(CATEGORIES);
    const slugs = new Set<string>(CITIES.map((c) => c.slug));
    for (const p of places) {
      expect(categories.has(p.category), `${p.id}: ${p.category}`).toBe(true);
      expect(slugs.has(p.city_slug), `${p.id}: ${p.city_slug}`).toBe(true);
    }
  });

  it("has unique, filter-safe ids", () => {
    expect(new Set(places.map((p) => p.id)).size).toBe(places.length);
    for (const p of places) expect(idSchema.safeParse(p.id).success, p.id).toBe(true);
  });

  it("every place has what the UI needs", () => {
    for (const p of places) {
      expect(p.name.trim(), p.id).not.toBe("");
      expect(p.pearlclub_url, p.id).toMatch(/^https:\/\/www\.pearlclub\.com\//);
      expect(p.price_level === null || (p.price_level >= 1 && p.price_level <= 4), p.id).toBe(true);
      if (p.description) expect(p.description.length, p.id).toBeLessThanOrEqual(600);
    }
  });

  it("coordinates are plausible when present", () => {
    for (const p of places) {
      if (p.lat != null) expect(Math.abs(p.lat), p.id).toBeLessThanOrEqual(90);
      if (p.lng != null) expect(Math.abs(p.lng), p.id).toBeLessThanOrEqual(180);
    }
  });

  it("the Python normaliser maps only to categories the app knows", () => {
    const source = readFileSync(resolve(root, "scraper/normalize.py"), "utf8");
    const block = source.slice(source.indexOf("CATEGORY_MAP"), source.indexOf("PRICE_LEVEL"));
    const mapped = [...block.matchAll(/:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(mapped.length).toBeGreaterThan(5);
    for (const category of mapped) expect(CATEGORIES as readonly string[]).toContain(category);
  });
});
