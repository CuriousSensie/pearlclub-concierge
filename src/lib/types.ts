export type Place = {
  id: string;
  name: string;
  city: string;
  city_slug: string;
  category: string;
  neighborhood: string | null;
  price_level: number | null;
  tags: string[];
  description: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  pearlclub_url: string;
  curator: string | null;
  curator_slug: string | null;
  curator_image: string | null;
  /** Pearl Club local type, e.g. localPerson (a resident) or localBusiness. */
  curator_type: string | null;
};

/** Place plus optional distance (km) from the guest/hotel, returned by search_places. */
export type PlaceSummary = Place & { distance_km?: number | null };

export type { Language } from "@/lib/domain";
import type { Language } from "@/lib/domain";

export type Profile = {
  session_id: string;
  name: string | null;
  language: Language;
  travel_style: string | null;
  budget: string | null;
  interests: string[];
  dietary: string[];
  home_city: string | null;
  updated_at?: string;
};

export type { TimeSlot, BookingType } from "@/lib/domain";
import type { TimeSlot, BookingType } from "@/lib/domain";

export type DayPlanStop = {
  time_slot: TimeSlot;
  place: PlaceSummary;
  reason: string;
  /** Estimated walking minutes from the previous stop (or the hotel for the first). */
  walk_min?: number | null;
};

export type BookingForm = {
  booking_type: BookingType;
  item_id: string;
  item_name: string;
  suggested_date?: string;
  suggested_time?: string;
  party_size?: number;
  notes?: string;
};

export type Booking = {
  id: string;
  hotel_id: string;
  booking_type: BookingType;
  item_id: string;
  item_name: string;
  date: string;
  time: string | null;
  party_size: number;
  guest_name: string;
  guest_email: string;
  room_number: string | null;
  notes: string | null;
  status: "requested" | "confirmed" | "cancelled";
  created_at: string;
};

export type UserLocation = { lat: number; lng: number };

/** Shapes of tool outputs as rendered by the UI (mirrors lib/tools.ts). */
export type BookingFormData = BookingForm & {
  item_name: string;
  requires_time?: boolean;
  hotel_id: string;
  pearlclub_url?: string;
};

export type PartOfDay = "morning" | "lunch" | "afternoon" | "evening" | "night";
export type Sky = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

/** A row of places on the welcome screen (built on the server without a model call). */
export type Rail = {
  kind: "now" | "local" | "budget";
  part: PartOfDay;
  rainy: boolean;
  places: PlaceSummary[];
};

/** Response of GET /api/discover. */
export type DiscoverResponse = {
  context: {
    partOfDay: PartOfDay;
    weekday: string;
    weather: { tempC: number; sky: Sky } | null;
    location: { label: string; shared: boolean };
  };
  rails: Rail[];
};
