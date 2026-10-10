import { tool } from "ai";
import { z } from "zod";
import { idSchema } from "@/lib/schemas";
import { getPlacesByIds } from "@/server/db/places";

export const placeDetailsTool = () =>
  tool({
    description: "Get full details of one place by id (from a previous search_places result).",
    inputSchema: z.object({ place_id: idSchema }),
    execute: async ({ place_id }) => {
      const [place] = await getPlacesByIds([place_id]);
      return place ? { place } : { error: "Place not found" };
    },
  });
