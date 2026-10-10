import { tool } from "ai";
import { z } from "zod";
import { canonicalServiceName } from "@/lib/services";
import { en, fill } from "@/lib/i18n";
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
    // The UI renders (and translates) the card; the model only needs the facts, in English.
    toModelOutput: ({ output }) => ({
      type: "json",
      value: output.services.map((svc) => ({
        id: svc.id,
        name: canonicalServiceName(svc.id),
        description: fill(en.services[svc.id].description, { airport: hotel.airport }),
        price: svc.priceFromEur == null ? "complimentary" : `from EUR ${svc.priceFromEur}`,
      })),
    }),
  });
