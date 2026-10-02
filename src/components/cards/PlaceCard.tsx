"use client";

import clsx from "clsx";
import { useApp } from "../AppContext";
import { formatDistance } from "@/lib/geo";
import type { PlaceSummary } from "@/types";

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: "☕",
  bakery: "🥐",
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  bar: "🍸",
  "outdoor-drinks": "🍹",
  "arts-culture": "🎨",
  market: "🧺",
  stay: "🛏️",
  shop: "🛍️",
  other: "✨",
};

const label = (category: string): string => category.replace(/-/g, " ");

export function PlaceCard({ place, compact = false }: { place: PlaceSummary; compact?: boolean }) {
  const { s, savedIds, toggleSave, sendText } = useApp();
  const saved = savedIds.has(place.id);
  const emoji = CATEGORY_EMOJI[place.category] ?? "✨";
  const meta = [
    label(place.category),
    place.neighborhood,
    place.price_level ? "$".repeat(place.price_level) : null,
  ].filter(Boolean);

  return (
    <article
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow)]",
        compact ? "w-full" : "w-[78vw] max-w-72 shrink-0 sm:w-full sm:max-w-none",
      )}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/30 to-line">
        {place.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote CMS images, no optimizer needed
          <img
            src={place.image_url}
            alt={place.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
            {emoji}
          </div>
        )}
        {place.distance_km != null && (
          <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {formatDistance(place.distance_km)} {s.away}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3 className="font-display text-xl leading-tight">{place.name}</h3>
          <p className="mt-0.5 text-xs capitalize text-muted">{meta.join(" · ")}</p>
        </div>
        {place.description && (
          <p className="line-clamp-2 text-sm text-ink/80">{place.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => void toggleSave(place)}
            className={clsx(
              "h-9 rounded-full border px-3.5 text-sm font-medium",
              saved ? "border-accent bg-accent text-accent-ink" : "border-line text-ink",
            )}
          >
            {saved ? "♥" : "♡"} {saved ? s.saved : s.save}
          </button>
          <button
            type="button"
            onClick={() => sendText(`I'd like to book ${place.name}`)}
            className="h-9 rounded-full border border-line px-3.5 text-sm font-medium"
          >
            {s.book}
          </button>
          <a
            href={place.pearlclub_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-auto text-sm font-medium text-accent underline"
          >
            {s.viewOnPearl} ↗
          </a>
        </div>
      </div>
    </article>
  );
}
