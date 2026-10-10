import { tool } from "ai";
import { z } from "zod";
import { CATEGORIES } from "@/lib/domain";
import { searchPlaces } from "@/server/search/search";
import { citySlugField, compactPlace, interestsOf, validCity, type ToolContext } from "./context";

export const searchPlacesTool = (ctx: ToolContext) =>
  tool({
    description:
      "Search Pearl Club's curated places. The ONLY source of place recommendations. Returns real places with ids.",
    inputSchema: z.object({
      city_slug: citySlugField,
      category: z.enum(CATEGORIES).optional(),
      price_max: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe("Max price level, 1 (cheap) to 4 (splurge)"),
      tags: z
        .array(
          z.enum([
            "budget",
            "splurge",
            "one-day",
            "weekend",
            "one-week",
            "one-month",
            "one-season",
          ]),
        )
        .optional()
        .describe(
          "Only for price feel (budget, splurge) or time needed. Do not use for themes; use query.",
        ),
      query: z
        .string()
        .max(120)
        .optional()
        .describe(
          "Optional specific descriptors only (cuisine, dish, vibe), e.g. 'natural wine' or 'vegetarian'. Never generic words like 'hidden gems' or 'best'; use category and city for those.",
        ),
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
        city_slug: validCity(ctx, input.city_slug),
        category: input.category,
        price_max: input.price_max,
        tags: input.tags,
        query: input.query,
        near: near ?? undefined,
        limit: input.limit ?? 6,
        excludeIds: input.include_saved ? [] : ctx.savedIds,
        interests: interestsOf(ctx.profile),
      });
      return { places };
    },
    toModelOutput: ({ output }) => ({
      type: "json",
      value: { places: output.places.map(compactPlace) },
    }),
  });
