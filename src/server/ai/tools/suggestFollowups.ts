import { tool } from "ai";
import { z } from "zod";

export const suggestFollowupsTool = () =>
  tool({
    description:
      "Offer 2-3 short next-step suggestions as tappable chips, in the guest's language. Call at the end of every turn.",
    inputSchema: z.object({
      suggestions: z.array(z.string().min(1)).min(2).max(3).describe("Each at most 40 characters"),
    }),
    execute: async ({ suggestions }) => ({ suggestions: suggestions.map((s) => s.slice(0, 40)) }),
  });
