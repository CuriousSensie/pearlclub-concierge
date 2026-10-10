import { tool } from "ai";
import { z } from "zod";
import { idSchema } from "@/lib/schemas";
import { getPlacesByIds } from "@/server/db/places";

export const showMapTool = () =>
  tool({
    description:
      "Show places on a map. Only needed outside plan_day, which already includes a map.",
    inputSchema: z.object({ place_ids: z.array(idSchema).min(1).max(12) }),
    execute: async ({ place_ids }) => {
      const places = (await getPlacesByIds(place_ids)).filter(
        (p) => p.lat != null && p.lng != null,
      );
      return places.length ? { places } : { error: "None of those places have coordinates" };
    },
  });
