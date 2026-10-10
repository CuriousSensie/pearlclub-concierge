import type { ServiceId } from "./domain";

/** Language-neutral service data. Names and descriptions live in the i18n dictionaries, keyed by `id`. */
export type HotelService = {
  id: ServiceId;
  /** Icon key understood by the UI (see components/ui/emoji.ts). */
  icon: string;
  requiresTime: boolean;
  /** Starting price in EUR, or null when the service is complimentary. */
  priceFromEur: number | null;
};

export type Hotel = {
  id: string;
  name: string;
  city: string;
  city_slug: string;
  lat: number;
  lng: number;
  timezone: string;
  /** Airport named in the airport-transfer description. */
  airport: string;
  tagline: string;
  services: HotelService[];
};

const commonServices = (spaFromEur: number): HotelService[] => [
  { id: "airport-transfer", icon: "car", requiresTime: true, priceFromEur: 65 },
  { id: "spa-treatment", icon: "spa", requiresTime: true, priceFromEur: spaFromEur },
  { id: "late-checkout", icon: "clock", requiresTime: false, priceFromEur: 40 },
  { id: "room-service-breakfast", icon: "breakfast", requiresTime: true, priceFromEur: 28 },
  { id: "restaurant-reservation", icon: "dining", requiresTime: true, priceFromEur: null },
  { id: "private-walking-tour", icon: "walk", requiresTime: true, priceFromEur: 120 },
];

export const HOTELS: Record<string, Hotel> = {
  "kensington-house": {
    id: "kensington-house",
    name: "The Kensington House",
    city: "London",
    city_slug: "london",
    lat: 51.4994,
    lng: -0.1745,
    timezone: "Europe/London",
    tagline: "A townhouse retreat in the heart of London",
    airport: "Heathrow",
    services: commonServices(95),
  },
  "casa-mar": {
    id: "casa-mar",
    name: "Casa Mar Barcelona",
    city: "Barcelona",
    city_slug: "barcelona",
    lat: 41.3851,
    lng: 2.1734,
    timezone: "Europe/Madrid",
    tagline: "Seaside calm steps from the Gothic Quarter",
    airport: "El Prat",
    services: commonServices(85),
  },
};

export const DEFAULT_HOTEL_ID = "kensington-house";

export function getHotel(id: string | null | undefined): Hotel {
  return (id && HOTELS[id]) || HOTELS[DEFAULT_HOTEL_ID];
}
