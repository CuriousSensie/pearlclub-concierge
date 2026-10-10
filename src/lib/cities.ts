/** Cities Pearl Club data covers. `flag` is Pearl Club's own asset (copied to /public/flags). */
export const CITIES = [
  { slug: "london", name: "London", code: "LDN", flag: "/flags/london.svg" },
  { slug: "barcelona", name: "Barcelona", code: "BCN", flag: "/flags/barcelona.svg" },
  { slug: "berlin", name: "Berlin", code: "BER", flag: "/flags/berlin.svg" },
  { slug: "paris", name: "Paris", code: "PAR", flag: "/flags/paris.svg" },
  { slug: "amsterdam", name: "Amsterdam", code: "AMS", flag: "/flags/amsterdam.svg" },
] as const;

export type CitySlug = (typeof CITIES)[number]["slug"];

export const cityBySlug = (slug: string) => CITIES.find((c) => c.slug === slug);
export const isCitySlug = (slug: string | undefined): slug is CitySlug =>
  !!slug && !!cityBySlug(slug);
