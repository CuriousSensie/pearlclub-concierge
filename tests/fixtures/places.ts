import type { Place } from "@/lib/types";

let counter = 0;

/** A valid place with sensible defaults (central London). */
export function makePlace(overrides: Partial<Place> = {}): Place {
  counter += 1;
  return {
    id: `place-${counter}`,
    name: `Place ${counter}`,
    city: "London",
    city_slug: "london",
    category: "cafe",
    neighborhood: null,
    price_level: 2,
    tags: [],
    description: "A nice place.",
    lat: 51.5,
    lng: -0.12,
    image_url: "https://example.com/p.jpg",
    pearlclub_url: "https://www.pearlclub.com/cities/london/cafes/x",
    curator: "Sienna L.",
    curator_slug: "sienna-l",
    curator_image: null,
    curator_type: "localPerson",
    ...overrides,
  };
}
