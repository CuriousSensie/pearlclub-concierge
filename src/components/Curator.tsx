"use client";

import { useApp } from "./AppContext";
import { fill } from "@/lib/i18n";
import type { Place } from "@/types";

/** The Pearl Club local behind a recommendation: the brand's differentiator, shown on every card. */
export function Curator({ place, size = "md" }: { place: Place; size?: "sm" | "md" }) {
  const { s } = useApp();
  if (!place.curator) return null;
  const dim = size === "sm" ? "size-5" : "size-6";
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      {place.curator_image ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
        <img
          src={`${place.curator_image}?w=48&h=48&fit=crop&auto=format`}
          alt=""
          loading="lazy"
          className={`${dim} shrink-0 rounded-full bg-line object-cover`}
        />
      ) : (
        <span
          aria-hidden
          className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent-text`}
        >
          {place.curator.charAt(0)}
        </span>
      )}
      <span className="min-w-0 truncate">{fill(s.recBy, { name: place.curator })}</span>
    </p>
  );
}
