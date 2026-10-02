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
};

/** Place plus optional distance (km) from the guest/hotel, returned by search_places. */
export type PlaceSummary = Place & { distance_km?: number | null };

export type Language = "en" | "es" | "fr" | "de" | "ar" | "ur";

export type Profile = {
  session_id: string;
  name: string | null;
  language: Language;
  travel_style: string | null;
  budget: string | null;
  interests: string[];
  dietary: string[];
  home_city: string | null;
};

export type TimeSlot = "morning" | "lunch" | "afternoon" | "evening";

export type DayPlanStop = { time_slot: TimeSlot; place: Place; reason: string };

export type BookingType = "hotel_service" | "place";

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

export type HotelServiceInfo = {
  id: string;
  name: string;
  description: string;
  price: string;
  requiresTime: boolean;
  icon: string;
};
