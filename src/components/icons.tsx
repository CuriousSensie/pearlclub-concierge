import type { ComponentProps } from "react";
import {
  BedDouble,
  Car,
  Clock,
  Coffee,
  Croissant,
  EggFried,
  Flower2,
  Footprints,
  Landmark,
  Martini,
  Palette,
  Sandwich,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  cafe: Coffee,
  bakery: Croissant,
  breakfast: EggFried,
  lunch: Sandwich,
  dinner: Utensils,
  bar: Martini,
  "outdoor-drinks": Wine,
  "arts-culture": Palette,
  market: ShoppingBasket,
  stay: BedDouble,
  shop: ShoppingBag,
  other: Landmark,
};

export const SERVICE_ICON: Record<string, LucideIcon> = {
  car: Car,
  spa: Flower2,
  clock: Clock,
  breakfast: Coffee,
  dining: Utensils,
  walk: Footprints,
};

type GlyphProps = Omit<ComponentProps<LucideIcon>, "ref">;

export function CategoryGlyph({ category, ...props }: GlyphProps & { category: string }) {
  const Icon = CATEGORY_ICON[category] ?? Sparkles;
  return <Icon {...props} />;
}

export function ServiceGlyph({ name, ...props }: GlyphProps & { name: string }) {
  const Icon = SERVICE_ICON[name] ?? Sparkles;
  return <Icon {...props} />;
}
