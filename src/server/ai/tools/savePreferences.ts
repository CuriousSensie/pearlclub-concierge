import { tool } from "ai";
import { z } from "zod";
import { upsertProfile } from "@/server/db/profiles";
import type { ToolContext } from "./context";

export const savePreferencesTool = ({ sessionId }: ToolContext) =>
  tool({
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
    execute: async (input) => ({ ok: true, profile: await upsertProfile(sessionId, input) }),
  });
