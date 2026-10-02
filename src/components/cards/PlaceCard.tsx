"use client";

import clsx from "clsx";
import { ExternalLink, Heart } from "lucide-react";
import { useApp } from "../AppContext";
import { Curator } from "../Curator";
import { CategoryGlyph } from "../icons";
import { formatDistance } from "@/lib/geo";
import type { PlaceSummary } from "@/types";

const label = (category: string): string => {
  const text = category.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** `card` is the carousel tile; `row` is the compact layout used in plans, details and the drawer. */
export function PlaceCard({
  place,
  variant = "card",
}: {
  place: PlaceSummary;
  variant?: "card" | "row";
}) {
  const { s, savedIds, toggleSave, sendText } = useApp();
  const saved = savedIds.has(place.id);
  const row = variant === "row";
  const meta = [label(place.category), place.price_level ? "$".repeat(place.price_level) : null]
    .filter(Boolean)
    .join(" · ");

  const heart = (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? s.saved : s.save}
      onClick={() => void toggleSave(place)}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        row ? "size-10" : "absolute end-2 top-2 size-10 bg-paper/90 backdrop-blur",
        saved ? "text-accent-text" : "text-ink",
      )}
    >
      <Heart
        aria-hidden
        className="size-5"
        fill={saved ? "currentColor" : "none"}
        strokeWidth={1.75}
      />
    </button>
  );

  const image = (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden bg-gradient-to-br from-accent/25 to-line",
        row ? "size-24 rounded-xl" : "aspect-[16/10]",
      )}
    >
      {place.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote CMS images, no optimizer needed
        <img
          src={place.image_url}
          alt={place.name}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-accent-text">
          <CategoryGlyph
            category={place.category}
            aria-hidden
            className="size-8"
            strokeWidth={1.5}
          />
        </div>
      )}
      {!row && place.distance_km != null && (
        <span className="absolute bottom-2 start-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
          {formatDistance(place.distance_km)} {s.away}
        </span>
      )}
      {!row && heart}
    </div>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => sendText(`I'd like to book ${place.name}`)}
        className="h-9 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
      >
        {s.book}
      </button>
      <a
        href={place.pearlclub_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={s.viewOnPearl}
        title={s.viewOnPearl}
        className={clsx(
          "inline-flex h-9 items-center gap-1.5 text-sm font-medium text-accent-text underline-offset-4 hover:underline",
          row && "w-9 justify-center rounded-full border border-line hover:no-underline",
        )}
      >
        {!row && s.viewOnPearl}
        <ExternalLink aria-hidden className="size-3.5 rtl:-scale-x-100" />
      </a>
    </div>
  );

  if (row) {
    return (
      <article className="flex gap-3 rounded-2xl border border-line bg-card p-2.5">
        {image}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h3 className="font-display text-xl leading-tight">{place.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <CategoryGlyph category={place.category} aria-hidden className="size-3.5" />
                {meta}
                {place.distance_km != null && ` · ${formatDistance(place.distance_km)}`}
              </p>
            </div>
            {heart}
          </div>
          <Curator place={place} size="sm" />
          {actions}
        </div>
      </article>
    );
  }

  return (
    <article className="flex w-[80vw] max-w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-card sm:w-full sm:max-w-none">
      {image}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-display text-[22px] leading-tight">{place.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <CategoryGlyph category={place.category} aria-hidden className="size-3.5" />
            {meta}
          </p>
        </div>
        <Curator place={place} />
        {place.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/80">{place.description}</p>
        )}
        <div className="mt-auto pt-1">{actions}</div>
      </div>
    </article>
  );
}
