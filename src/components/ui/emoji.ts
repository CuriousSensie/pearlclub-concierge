/** Pearl Club's iconography for content is emoji; outline icons are reserved for controls. */
export const CATEGORY_EMOJI: Record<string, string> = {
  cafe: "☕",
  bakery: "🥖",
  breakfast: "🍳",
  lunch: "🥪",
  dinner: "🍽️",
  bar: "🥃",
  "outdoor-drinks": "🍹",
  "arts-culture": "🎭",
  market: "🧺",
  stay: "🛏️",
  shop: "🛍️",
  other: "✨",
};

export const SERVICE_EMOJI: Record<string, string> = {
  car: "🚗",
  spa: "💆",
  clock: "🕓",
  breakfast: "🥐",
  dining: "🍽️",
  walk: "🚶",
};

export const categoryEmoji = (category: string): string => CATEGORY_EMOJI[category] ?? "✨";
export const serviceEmoji = (key: string): string => SERVICE_EMOJI[key] ?? "✨";
