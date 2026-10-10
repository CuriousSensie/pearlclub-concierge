import { tool } from "ai";
import { z } from "zod";
import { TIME_SLOTS } from "@/lib/domain";
import { idSchema, isoDateSchema } from "@/lib/schemas";
import { buildPlan } from "@/server/ai/planner";
import { citySlugField, interestsOf, validCity, type ToolContext } from "./context";

export const planDayTool = (ctx: ToolContext) =>
  tool({
    description:
      "Build a full-day itinerary (morning, lunch, afternoon, evening) from Pearl Club places, in a walkable order, aware of the weather. Call this directly; do not search first. To swap one stop, pass keep (the stops to keep) and exclude_ids (the stop being replaced).",
    inputSchema: z.object({
      city_slug: citySlugField,
      date: isoDateSchema.optional(),
      theme: z
        .string()
        .max(80)
        .optional()
        .describe("Short title for the day, in the guest's language"),
      vibe: z
        .string()
        .max(120)
        .optional()
        .describe("Optional mood or interests, e.g. 'quiet, bookish, vegetarian'"),
      slots: z.array(z.enum(TIME_SLOTS)).optional().describe("Defaults to all four slots"),
      keep: z
        .array(z.object({ time_slot: z.enum(TIME_SLOTS), place_id: idSchema }))
        .max(4)
        .optional(),
      exclude_ids: z.array(idSchema).max(20).optional(),
    }),
    execute: async ({ city_slug, date, theme, vibe, slots, keep, exclude_ids }) => {
      const city = validCity(ctx, city_slug);
      const plan = await buildPlan({
        hotel: ctx.hotel,
        citySlug: city,
        vibe,
        slots,
        keep,
        excludeIds: exclude_ids,
        interests: interestsOf(ctx.profile),
        rainy: ctx.rainy,
      });
      if (!plan.length) return { error: "No places found for that plan" };
      return { city_slug: city, date, theme, rainy: ctx.rainy, plan };
    },
    toModelOutput: ({ output }) => ({
      type: "json",
      value:
        "error" in output
          ? output
          : {
              rainy_day: output.rainy,
              plan: output.plan.map((st) => ({
                slot: st.time_slot,
                id: st.place.id,
                name: st.place.name,
                category: st.place.category,
                recommended_by: st.place.curator,
                walk_min: st.walk_min,
              })),
            },
    }),
  });
