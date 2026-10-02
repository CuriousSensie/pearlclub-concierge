export type HotelService = {
  id: string;
  name: string;
  description: string;
  price: string;
  requiresTime: boolean;
  icon: string;
};

export type Hotel = {
  id: string;
  name: string;
  city: string;
  city_slug: string;
  lat: number;
  lng: number;
  timezone: string;
  accentColor: string;
  tagline: string;
  services: HotelService[];
};

const commonServices = (airport: string, spaPrice: string): HotelService[] => [
  {
    id: "airport-transfer",
    name: "Airport transfer",
    description: `Private car to or from ${airport}.`,
    price: "from €65",
    requiresTime: true,
    icon: "car",
  },
  {
    id: "spa-treatment",
    name: "Spa treatment",
    description: "60-minute massage or facial in our spa.",
    price: spaPrice,
    requiresTime: true,
    icon: "spa",
  },
  {
    id: "late-checkout",
    name: "Late checkout",
    description: "Keep your room until 4 pm, subject to availability.",
    price: "from €40",
    requiresTime: false,
    icon: "clock",
  },
  {
    id: "room-service-breakfast",
    name: "Room-service breakfast",
    description: "Continental or full breakfast delivered to your room.",
    price: "from €28",
    requiresTime: true,
    icon: "breakfast",
  },
  {
    id: "restaurant-reservation",
    name: "Restaurant reservation assistance",
    description: "We secure a table at a Pearl Club favourite for you.",
    price: "Complimentary",
    requiresTime: true,
    icon: "dining",
  },
  {
    id: "private-walking-tour",
    name: "Private guided walking tour",
    description: "Two hours with a local guide, tailored to your interests.",
    price: "from €120",
    requiresTime: true,
    icon: "walk",
  },
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
    accentColor: "#8a5a2b",
    tagline: "A townhouse retreat in the heart of London",
    services: commonServices("Heathrow", "from €95"),
  },
  "casa-mar": {
    id: "casa-mar",
    name: "Casa Mar Barcelona",
    city: "Barcelona",
    city_slug: "barcelona",
    lat: 41.3851,
    lng: 2.1734,
    timezone: "Europe/Madrid",
    accentColor: "#1f6f78",
    tagline: "Seaside calm steps from the Gothic Quarter",
    services: commonServices("El Prat", "from €85"),
  },
};

export const DEFAULT_HOTEL_ID = "kensington-house";

export function getHotel(id: string | null | undefined): Hotel {
  return (id && HOTELS[id]) || HOTELS[DEFAULT_HOTEL_ID];
}

/** Cities Pearl Club data currently covers (display names), used in the system prompt. */
export const COVERED_CITIES: { slug: string; name: string }[] = [
  { slug: "london", name: "London" },
  { slug: "barcelona", name: "Barcelona" },
  { slug: "berlin", name: "Berlin" },
  { slug: "paris", name: "Paris" },
  { slug: "amsterdam", name: "Amsterdam" },
];
