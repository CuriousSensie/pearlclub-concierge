import { z } from "zod";
import { CITIES, isCitySlug } from "@/lib/cities";
import type { Hotel } from "@/lib/hotels";
import type { PlaceSummary, Profile, UserLocation } from "@/lib/types";

/** Everything a tool needs to know about the current guest and moment. */
export type ToolContext = {
  sessionId: string;
  hotel: Hotel;
  profile: Profile | null;
  savedIds: string[];
  userLocation: UserLocation | null;
  rainy: boolean;
};

export const citySlugField = z
  .string()
  .optional()
  .describe(
    `City slug. One of: ${CITIES.map((c) => c.slug).join(", ")}. Defaults to the hotel's city.`,
  );

/** Falls back to the hotel's city for anything the model invents. */
export const validCity = (ctx: ToolContext, slug: string | undefined): string =>
  isCitySlug(slug) ? slug : ctx.hotel.city_slug;

/** Interests the model should personalise with: saved interests plus travel style. */
export const interestsOf = (profile: Profile | null): string[] => [
  ...(profile?.interests ?? []),
  ...(profile?.travel_style ? [profile.travel_style] : []),
];

/** Trimmed view of a place sent back to the model (the UI still gets the full record). */
export const compactPlace = (p: PlaceSummary) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price_level ? "$".repeat(p.price_level) : null,
  recommended_by: p.curator,
  about: p.description ? p.description.slice(0, 180) : null,
  distance_km: p.distance_km ?? null,
});
