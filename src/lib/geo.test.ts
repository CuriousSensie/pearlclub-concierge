import { describe, expect, it } from "vitest";
import { formatDistance, haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(51.5, -0.12, 51.5, -0.12)).toBe(0);
  });

  it("matches a known distance (London to Paris is about 344 km)", () => {
    expect(haversineKm(51.5074, -0.1278, 48.8566, 2.3522)).toBeCloseTo(343.5, 0);
  });

  it("is symmetric", () => {
    expect(haversineKm(41.39, 2.17, 52.52, 13.4)).toBeCloseTo(
      haversineKm(52.52, 13.4, 41.39, 2.17),
      9,
    );
  });
});

describe("formatDistance", () => {
  it("uses metres under a kilometre, rounded to 10 m", () => {
    expect(formatDistance(0.352)).toBe("350 m");
  });

  it("uses one-decimal kilometres from 1 km", () => {
    expect(formatDistance(1.24)).toBe("1.2 km");
  });
});
