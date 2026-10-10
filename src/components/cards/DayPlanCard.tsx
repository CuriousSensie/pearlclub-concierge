"use client";

import { BookmarkPlus, CloudRain, Footprints, Shuffle } from "lucide-react";
import { useApp } from "@/components/chat/ConciergeContext";
import { MapCard } from "@/components/cards/MapCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { fill } from "@/lib/i18n";
import type { DayPlanStop, TimeSlot } from "@/lib/types";

/** "Saturday 3 October" in the guest's language; falls back to the raw string if it isn't a date. */
function formatDate(iso: string, lang: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });
}

export function DayPlanCard({
  plan,
  theme,
  date,
  rainy,
}: {
  plan: DayPlanStop[];
  theme?: string;
  date?: string;
  rainy?: boolean;
}) {
  const { s, lang, saveMany, sendText } = useApp();
  const slotLabel: Record<TimeSlot, string> = {
    morning: s.slotMorning,
    lunch: s.slotLunch,
    afternoon: s.slotAfternoon,
    evening: s.slotEvening,
  };

  return (
    <section className="space-y-4">
      {(theme || date) && (
        <h3 className="font-display text-3xl italic leading-tight">
          {[theme, date && formatDate(date, lang)].filter(Boolean).join(" · ")}
        </h3>
      )}
      {rainy && (
        <p className="pc-chip">
          <CloudRain aria-hidden className="size-4" strokeWidth={1.75} />
          {s.rainNote}
        </p>
      )}
      <ol className="space-y-6">
        {plan.map((stop, i) => (
          <li key={`${stop.place.id}-${i}`} className="relative ps-8">
            <span
              aria-hidden
              className="pc-title absolute start-0 top-0 inline-flex size-6 items-center justify-center rounded-full bg-[var(--black)] text-xs text-white"
            >
              {i + 1}
            </span>
            {i < plan.length - 1 && (
              <span aria-hidden className="absolute -bottom-6 start-[11.5px] top-7 w-px bg-line" />
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="pc-title text-sm">{slotLabel[stop.time_slot]}</p>
              {stop.walk_min != null && (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                  <Footprints aria-hidden className="size-3.5" />
                  {fill(s.walkMin, { n: String(stop.walk_min) })}
                </span>
              )}
            </div>
            <p className="mb-3 mt-1 text-sm leading-5 text-muted">{stop.reason}</p>
            <PlaceCard place={stop.place} variant="row" />
            <button
              type="button"
              onClick={() =>
                sendText(
                  fill(s.swapPrompt, {
                    n: String(i + 1),
                    slot: slotLabel[stop.time_slot],
                    name: stop.place.name,
                  }),
                )
              }
              className="pc-chip mt-2.5 min-h-8 text-[13px]"
            >
              <Shuffle aria-hidden className="size-3.5" />
              {s.swap}
            </button>
          </li>
        ))}
      </ol>
      <MapCard places={plan.map((p) => p.place)} numbered />
      <button
        type="button"
        onClick={() => void saveMany(plan.map((p) => p.place))}
        className="pc-btn"
      >
        <BookmarkPlus aria-hidden className="size-4" />
        {s.saveAll}
      </button>
    </section>
  );
}
