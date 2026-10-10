"use client";

import clsx from "clsx";
import { ExternalLink, Heart } from "lucide-react";
import Image from "next/image";
import { useApp } from "@/components/chat/ConciergeContext";
import { Curator, CuratorAvatar } from "@/components/cards/Curator";
import { categoryEmoji } from "@/components/ui/emoji";
import { formatDistance } from "@/lib/geo";
import { CITY_META } from "@/lib/hotels";
import type { PlaceSummary } from "@/lib/types";

/** Flag + city code, category emoji and price: the footer facts on every Pearl Club card. */
function Facts({ place }: { place: PlaceSummary }) {
  const city = CITY_META[place.city_slug];
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center gap-1.5">
        {city && <Image src={city.flag} alt="" width={20} height={20} className="size-5" />}
        <span className="pc-title text-[13px]">
          {city?.code ?? place.city_slug.slice(0, 3).toUpperCase()}
        </span>
      </span>
      <span
        aria-label={place.category.replace(/-/g, " ")}
        role="img"
        className="text-lg leading-none"
      >
        {categoryEmoji(place.category)}
      </span>
      {place.price_level ? (
        <span className="rounded-md border border-slate-300 px-1.5 text-[13px] leading-5 text-slate-400">
          {"$".repeat(place.price_level)}
        </span>
      ) : null}
    </div>
  );
}

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

  const heart = (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? s.saved : s.save}
      onClick={() => void toggleSave(place)}
      className={clsx("pc-fab shrink-0", row ? "size-10" : "size-9")}
    >
      <Heart
        aria-hidden
        className={clsx("size-[18px]", saved && "text-[var(--grad-red)]")}
        fill={saved ? "currentColor" : "none"}
        strokeWidth={1.75}
      />
    </button>
  );

  const link = (
    <a
      href={place.pearlclub_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.viewOnPearl}
      title={s.viewOnPearl}
      className={clsx("pc-fab shrink-0", row ? "size-10" : "size-9")}
    >
      <ExternalLink aria-hidden className="size-4 rtl:-scale-x-100" strokeWidth={1.75} />
    </a>
  );

  const book = (
    <button
      type="button"
      onClick={() => sendText(`I'd like to book ${place.name}`)}
      className="pc-btn pc-btn-sm"
    >
      {s.book}
    </button>
  );

  const photo = place.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote CMS images, no optimizer needed
    <img src={place.image_url} alt={place.name} loading="lazy" className="size-full object-cover" />
  ) : (
    <div className="flex size-full items-center justify-center bg-strip text-4xl" aria-hidden>
      {categoryEmoji(place.category)}
    </div>
  );

  if (row) {
    return (
      <article className="pc-card overflow-hidden">
        <div className="flex gap-3 p-3">
          <div className="relative size-24 shrink-0">
            <div className="size-full overflow-hidden rounded-2xl bg-line">{photo}</div>
            <div className="absolute -bottom-2 -end-2">
              <CuratorAvatar place={place} className="size-8" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="pc-title text-base leading-tight">{place.name}</h3>
            <Curator place={place} />
            {place.distance_km != null && (
              <p className="text-xs text-muted">
                {formatDistance(place.distance_km)} {s.away}
              </p>
            )}
          </div>
        </div>
        <div className="pc-strip flex items-center justify-between gap-2 px-3 py-2">
          <Facts place={place} />
          <div className="flex items-center gap-1.5">
            {heart}
            {link}
            {book}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="pc-card flex w-[80vw] max-w-72 shrink-0 flex-col overflow-hidden sm:w-full sm:max-w-none">
      <div className="relative p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-line">
          {photo}
          <div className="absolute end-2 top-2 flex gap-1.5">
            {heart}
            {link}
          </div>
          {place.distance_km != null && (
            <span className="absolute bottom-2 start-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
              {formatDistance(place.distance_km)} {s.away}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 end-6 translate-y-1/3">
          <CuratorAvatar place={place} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-3 pt-3">
        <h3 className="pc-title text-xl leading-tight">{place.name}</h3>
        {place.description && (
          <p className="line-clamp-3 text-sm leading-5 text-muted">{place.description}</p>
        )}
        <Curator place={place} />
      </div>
      <div className="pc-strip flex items-center justify-between gap-2 px-4 py-3">
        <Facts place={place} />
        {book}
      </div>
    </article>
  );
}
