import "server-only";
import { hotelServicesTool } from "./hotelServices";
import { placeDetailsTool } from "./placeDetails";
import { planDayTool } from "./planDay";
import { proposeBookingTool } from "./proposeBooking";
import { savePreferencesTool } from "./savePreferences";
import { searchPlacesTool } from "./searchPlaces";
import { showMapTool } from "./showMap";
import { suggestFollowupsTool } from "./suggestFollowups";
import type { ToolContext } from "./context";

export type { ToolContext } from "./context";

/** The concierge's tools. Names must match `TOOL_NAMES` in `@/lib/domain`. */
export function createTools(ctx: ToolContext) {
  return {
    search_places: searchPlacesTool(ctx),
    get_place_details: placeDetailsTool(),
    get_hotel_services: hotelServicesTool(ctx),
    propose_booking: proposeBookingTool(ctx),
    save_preferences: savePreferencesTool(ctx),
    plan_day: planDayTool(ctx),
    show_map: showMapTool(),
    suggest_followups: suggestFollowupsTool(),
  };
}

export type ConciergeTools = ReturnType<typeof createTools>;
