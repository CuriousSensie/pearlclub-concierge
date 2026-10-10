"use client";

import { useApp } from "@/components/chat/ConciergeContext";
import { fill } from "@/lib/i18n";
import type { Place } from "@/lib/types";

/** The curator's photo as a ringed circle, like the avatars that overlap Pearl Club place photos. */
export function CuratorAvatar({
  place,
  className = "size-10",
}: {
  place: Place;
  className?: string;
}) {
  if (!place.curator) return null;
  return place.curator_image ? (
    // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
    <img
      src={`${place.curator_image}?w=96&h=96&fit=crop&auto=format`}
      alt={place.curator}
      loading="lazy"
      className={`${className} rounded-full border-2 border-white bg-line object-cover shadow-sm`}
    />
  ) : (
    <span
      aria-hidden
      className={`${className} inline-flex items-center justify-center rounded-full border-2 border-white bg-strip text-xs font-bold shadow-sm`}
    >
      {place.curator.charAt(0)}
    </span>
  );
}

/** "Recommended by Sienna L.": the Pearl Club local behind a pick. */
export function Curator({ place }: { place: Place }) {
  const { s } = useApp();
  if (!place.curator) return null;
  return <p className="truncate text-xs text-muted">{fill(s.recBy, { name: place.curator })}</p>;
}
