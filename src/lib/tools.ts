import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getPlacesByIds, searchPlaces } from "./places";
import { upsertProfile } from "./profile";
import { COVERED_CITIES, type Hotel } from "./hotels";
import type { Place, Profile, TimeSlot, UserLocation } from "@/types";

export type ToolContext = {
  sessionId: string;
  hotel: Hotel;
  profile: Profile | null;
  savedIds: string[];
  userLocation: UserLocation | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_SLOTS = [
  "morning",
  "lunch",
  "afternoon",
  "evening",
] as const satisfies readonly TimeSlot[];
const citySlug = z
  .string()
  .optional()
  .describe(
    `City slug. One of: ${COVERED_CITIES.map((c) => c.slug).join(", ")}. Defaults to the hotel's city.`,
  );

export function createTools(ctx: ToolContext) {
  const { hotel, profile } = ctx;
  const validCity = (slug: string | undefined): string =>
    slug && COVERED_CITIES.some((c) => c.slug === slug) ? slug : hotel.city_slug;

  return {
    search_places: tool({
      description:
        "Search Pearl Club's curated places. The ONLY source of place recommendations. Returns real places with ids.",
      inputSchema: z.object({
        city_slug: citySlug,
        category: z
          .enum([
            "cafe",
            "bakery",
            "breakfast",
            "lunch",
            "dinner",
            "bar",
            "outdoor-drinks",
            "arts-culture",
            "market",
            "stay",
            "shop",
            "other",
          ])
          .optional(),
        price_max: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("Max price level, 1 (cheap) to 4 (splurge)"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Lowercase tags such as budget, splurge, one-day"),
        query: z
          .string()
          .max(120)
          .optional()
          .describe("Free-text keywords, e.g. 'cozy vegetarian natural wine'"),
        near_lat: z.number().min(-90).max(90).optional(),
        near_lng: z.number().min(-180).max(180).optional(),
        include_saved: z
          .boolean()
          .optional()
          .describe("Include places the guest already saved (default false)"),
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async (input) => {
        const near =
          input.near_lat != null && input.near_lng != null
            ? { lat: input.near_lat, lng: input.near_lng }
            : ctx.userLocation;
        const places = await searchPlaces({
          city_slug: validCity(input.city_slug),
          category: input.category,
          price_max: input.price_max,
          tags: input.tags,
          query: input.query,
          near: near ?? undefined,
          limit: input.limit ?? 6,
          excludeIds: input.include_saved ? [] : ctx.savedIds,
          interests: [
            ...(profile?.interests ?? []),
            ...(profile?.travel_style ? [profile.travel_style] : []),
          ],
        });
        return { places };
      },
    }),

    get_place_details: tool({
      description: "Get full details of one place by id (from a previous search_places result).",
      inputSchema: z.object({ place_id: z.string() }),
      execute: async ({ place_id }) => {
        const [place] = await getPlacesByIds([place_id]);
        return place ? { place } : { error: "Place not found" };
      },
    }),

    get_hotel_services: tool({
      description:
        "List the services offered by the guest's hotel (transfers, spa, late checkout, etc.).",
      inputSchema: z.object({}),
      execute: async () => ({
        hotel: { id: hotel.id, name: hotel.name, city: hotel.city },
        services: hotel.services,
      }),
    }),

    propose_booking: tool({
      description:
        "Prepare a booking REQUEST form for the guest to review and submit. Does NOT book anything. Use a hotel service id from get_hotel_services, or a place id from search_places.",
      inputSchema: z.object({
        booking_type: z.enum(["hotel_service", "place"]),
        item_id: z.string(),
        item_name: z.string(),
        suggested_date: z.string().regex(ISO_DATE).optional().describe("YYYY-MM-DD"),
        suggested_time: z.string().max(20).optional().describe("HH:MM, 24h"),
        party_size: z.number().int().min(1).max(20).optional(),
        notes: z.string().max(300).optional(),
      }),
      execute: async (input) => {
        // Resolve the canonical item so a hallucinated id/name can never reach the form.
        if (input.booking_type === "hotel_service") {
          const service = hotel.services.find((s) => s.id === input.item_id);
          if (!service)
            return {
              error: `Unknown hotel service id. Valid: ${hotel.services.map((s) => s.id).join(", ")}`,
            };
          return {
            form: {
              ...input,
              item_name: service.name,
              requires_time: service.requiresTime,
              hotel_id: hotel.id,
            },
          };
        }
        const [place] = await getPlacesByIds([input.item_id]);
        if (!place) return { error: "Unknown place id. Call search_places first." };
        return {
          form: {
            ...input,
            item_name: place.name,
            requires_time: true,
            hotel_id: hotel.id,
            pearlclub_url: place.pearlclub_url,
          },
        };
      },
    }),

    save_preferences: tool({
      description:
        "Remember guest preferences revealed in conversation (diet, budget, interests, travel style, name).",
      inputSchema: z.object({
        name: z.string().max(60).optional(),
        travel_style: z
          .string()
          .max(30)
          .optional()
          .describe("foodie | culture | nightlife | relaxed | family"),
        budget: z.enum(["budget", "mid", "luxury"]).optional(),
        interests: z.array(z.string().max(30)).max(10).optional(),
        dietary: z.array(z.string().max(30)).max(10).optional(),
      }),
      execute: async (input) => {
        const saved = await upsertProfile(ctx.sessionId, input);
        return { ok: true, profile: saved };
      },
    }),

    plan_day: tool({
      description:
        "Build a day itinerary from place ids returned by search_places. Call search_places first. 3-5 stops in geographic and time order.",
      inputSchema: z.object({
        city_slug: citySlug,
        date: z.string().regex(ISO_DATE).optional(),
        theme: z.string().max(80).optional(),
        stops: z
          .array(
            z.object({
              time_slot: z.enum(TIME_SLOTS),
              place_id: z.string(),
              reason: z.string().max(240),
            }),
          )
          .min(2)
          .max(6),
      }),
      execute: async ({ city_slug, date, theme, stops }) => {
        const places = await getPlacesByIds(stops.map((s) => s.place_id));
        const byId = new Map<string, Place>(places.map((p) => [p.id, p]));
        const missing = stops.filter((s) => !byId.has(s.place_id)).map((s) => s.place_id);
        if (missing.length)
          return { error: `Unknown place ids: ${missing.join(", ")}. Use ids from search_places.` };
        return {
          city_slug: validCity(city_slug),
          date,
          theme,
          plan: stops.map((s) => ({
            time_slot: s.time_slot,
            place: byId.get(s.place_id) as Place,
            reason: s.reason,
          })),
        };
      },
    }),

    show_map: tool({
      description:
        "Show places on a map. Only needed outside plan_day, which already includes a map.",
      inputSchema: z.object({ place_ids: z.array(z.string()).min(1).max(12) }),
      execute: async ({ place_ids }) => {
        const places = (await getPlacesByIds(place_ids)).filter(
          (p) => p.lat != null && p.lng != null,
        );
        return places.length ? { places } : { error: "None of those places have coordinates" };
      },
    }),

    suggest_followups: tool({
      description:
        "Offer 2-3 short next-step suggestions as tappable chips, in the guest's language. Call at the end of every turn.",
      inputSchema: z.object({
        suggestions: z
          .array(z.string().min(1))
          .min(2)
          .max(3)
          .describe("Each at most 40 characters"),
      }),
      execute: async ({ suggestions }) => ({ suggestions: suggestions.map((s) => s.slice(0, 40)) }),
    }),
  };
}

export type ConciergeTools = ReturnType<typeof createTools>;
