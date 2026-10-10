import { tool } from "ai";
import { z } from "zod";
import { BOOKING_TYPES } from "@/lib/domain";
import { idSchema, isoDateSchema } from "@/lib/schemas";
import { canonicalServiceName } from "@/lib/services";
import { getPlacesByIds } from "@/server/db/places";
import type { ToolContext } from "./context";

/**
 * Prepares a booking form for the guest to review and submit. It never books anything: the form posts
 * to /api/bookings directly, so the model cannot create a booking with hallucinated details.
 */
export const proposeBookingTool = ({ hotel }: ToolContext) =>
  tool({
    description:
      "Prepare a booking REQUEST form for the guest to review and submit. Does NOT book anything. Use a hotel service id from get_hotel_services, or a place id from search_places.",
    inputSchema: z.object({
      booking_type: z.enum(BOOKING_TYPES),
      item_id: idSchema,
      item_name: z.string().max(200),
      suggested_date: isoDateSchema.optional().describe("YYYY-MM-DD"),
      suggested_time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .describe("HH:MM, 24h"),
      party_size: z.number().int().min(1).max(20).optional(),
      notes: z.string().max(300).optional(),
    }),
    execute: async (input) => {
      // Resolve the canonical item so a hallucinated id/name can never reach the form.
      if (input.booking_type === "hotel_service") {
        const service = hotel.services.find((s) => s.id === input.item_id);
        if (!service) {
          return {
            error: `Unknown hotel service id. Valid: ${hotel.services.map((s) => s.id).join(", ")}`,
          };
        }
        return {
          form: {
            ...input,
            item_name: canonicalServiceName(service.id),
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
  });
