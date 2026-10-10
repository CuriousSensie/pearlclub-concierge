/** Single source of truth for closed vocabularies shared by the UI, API schemas and AI tools. */

export const CATEGORIES = [
  "cafe",
  "bakery",
  "breakfast",
  "lunch",
  "dinner",
  "bar",
  "outdoor-drinks",
  "arts-culture",
  "market",
  "stay",
  "shop",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const TIME_SLOTS = ["morning", "lunch", "afternoon", "evening"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const LANGUAGE_CODES = ["en", "es", "fr", "de", "ar", "ur"] as const;
export type Language = (typeof LANGUAGE_CODES)[number];

export const BOOKING_TYPES = ["hotel_service", "place"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_STATUSES = ["requested", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Tool names the model may call; also the only tool parts accepted back from the client. */
export const TOOL_NAMES = [
  "search_places",
  "get_place_details",
  "get_hotel_services",
  "propose_booking",
  "save_preferences",
  "plan_day",
  "show_map",
  "suggest_followups",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** Request limits. */
export const LIMITS = {
  /** Maximum JSON body for chat requests. */
  chatBodyBytes: 64_000,
  /** Maximum JSON body for small write endpoints. */
  writeBodyBytes: 8_000,
  /** User text kept per message. */
  inputChars: 1000,
  /** Messages kept as model context. */
  historyMessages: 20,
  /** Messages accepted per request. */
  requestMessages: 30,
  /** Largest tool input/output (as JSON) accepted back from the client. */
  toolPayloadChars: 30_000,
} as const;
