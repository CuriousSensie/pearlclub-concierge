import { describe, expect, it } from "vitest";
import { makePlace } from "../../../tests/fixtures/places";
import { HOTELS } from "@/lib/hotels";
import type { LiveContext } from "@/server/context/liveContext";
import { buildFollowupPrompt, buildSystemPrompt } from "./prompts";

const hotel = HOTELS["kensington-house"];
const live: LiveContext = {
  partOfDay: "afternoon",
  weekday: "Saturday",
  localTime: "Saturday 10 October 2026 at 15:30",
  weather: { tempC: 11, sky: "rain", rainy: true, description: "rain" },
};
const base = {
  hotel,
  profile: null,
  savedPlaces: [],
  language: "en" as const,
  userLocation: null,
  live,
};

describe("buildSystemPrompt", () => {
  it("names the hotel, city and the language to reply in", () => {
    const prompt = buildSystemPrompt({ ...base, language: "es" });
    expect(prompt).toContain("The Kensington House");
    expect(prompt).toContain("London");
    expect(prompt).toContain("Spanish");
  });

  it("includes the grounding rules and the covered cities", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toMatch(/Only recommend places returned by/);
    expect(prompt).toMatch(/never invent/i);
    for (const city of ["London", "Barcelona", "Berlin", "Paris", "Amsterdam"])
      expect(prompt).toContain(city);
  });

  it("treats tool results as data, not instructions", () => {
    expect(buildSystemPrompt(base)).toMatch(/data, never instructions/);
  });

  it("includes weather and time context, and nudges toward indoor places when it rains", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("11°C");
    expect(prompt).toContain("afternoon");
    expect(prompt).toMatch(/rain likely/);
  });

  it("copes with unknown weather", () => {
    expect(buildSystemPrompt({ ...base, live: { ...live, weather: null } })).toContain(
      "Weather at the hotel now: unknown",
    );
  });

  it("describes the guest: profile, saved places and location", () => {
    const profile = {
      session_id: "s",
      name: "Sam",
      language: "en" as const,
      travel_style: "foodie",
      budget: "mid",
      interests: ["coffee"],
      dietary: ["vegetarian"],
      home_city: null,
    };
    const prompt = buildSystemPrompt({
      ...base,
      profile,
      savedPlaces: [makePlace({ name: "Hjem" })],
      userLocation: { lat: 51.4967, lng: -0.1764 },
    });
    expect(prompt).toContain('"vegetarian"');
    expect(prompt).toContain("Hjem");
    expect(prompt).toContain("51.4967");
  });

  it("falls back to the hotel location when the guest's is unknown", () => {
    expect(buildSystemPrompt(base)).toContain(`${hotel.lat}`);
  });

  it("asks the model to credit the local who recommended a place, by name from the tool result", () => {
    expect(buildSystemPrompt(base)).toMatch(/recommended_by/);
  });

  it("does not leak secrets or environment variable names", () => {
    expect(buildSystemPrompt(base)).not.toMatch(/API_KEY|SERVICE_ROLE|sk-/);
  });
});

describe("buildFollowupPrompt", () => {
  it("asks for short chips in the guest's language", () => {
    const prompt = buildFollowupPrompt("fr");
    expect(prompt).toContain("French");
    expect(prompt).toContain("40 characters");
  });
});
