import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./context";

export const hotelServicesTool = ({ hotel }: ToolContext) =>
  tool({
    description:
      "List the services offered by the guest's hotel (transfers, spa, late checkout, etc.).",
    inputSchema: z.object({}),
    execute: async () => ({
      hotel: { id: hotel.id, name: hotel.name, city: hotel.city },
      services: hotel.services,
    }),
  });
