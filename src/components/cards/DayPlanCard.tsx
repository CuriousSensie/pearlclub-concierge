"use client";

import { BookmarkPlus, Footprints, Shuffle } from "lucide-react";
import { useApp } from "../AppContext";
import { MapCard } from "./MapCard";
import { PlaceCard } from "./PlaceCard";
import { fill } from "@/lib/i18n";
import type { DayPlanStop, TimeSlot } from "@/types";

export function DayPlanCard({
  plan,
  theme,
  date,
}: {
  plan: DayPlanStop[];
  theme?: string;
  date?: string;
}) {
  const { s, saveMany, sendText } = useApp();
  const slotLabel: Record<TimeSlot, string> = {
    morning: s.slotMorning,
    lunch: s.slotLunch,
    afternoon: s.slotAfternoon,
    evening: s.slotEvening,
  };

  return (
    <section className="space-y-4">
      {(theme || date) && (
        <h3 className="font-display text-2xl">{[theme, date].filter(Boolean).join(" · ")}</h3>
      )}
      <ol className="space-y-5">
        {plan.map((stop, i) => (
          <li key={`${stop.place.id}-${i}`} className="relative ps-7">
            <span
              aria-hidden
              className="absolute start-0 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink"
            >
              {i + 1}
            </span>
            {i < plan.length - 1 && (
              <span aria-hidden className="absolute -bottom-5 start-[9.5px] top-6 w-px bg-line" />
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{slotLabel[stop.time_slot]}</p>
              {stop.walk_min != null && (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Footprints aria-hidden className="size-3.5" />
                  {fill(s.walkMin, { n: String(stop.walk_min) })}
                </span>
              )}
            </div>
            <p className="mb-2.5 mt-0.5 text-sm leading-relaxed text-muted">{stop.reason}</p>
            <PlaceCard place={stop.place} variant="row" />
            <button
              type="button"
              onClick={() =>
                sendText(
                  `Swap stop ${i + 1} (${stop.time_slot}: ${stop.place.name}) for something different.`,
                )
              }
              className="mt-1.5 inline-flex h-8 items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              <Shuffle aria-hidden className="size-3.5" />
              {s.swap}
            </button>
          </li>
        ))}
      </ol>
      <MapCard places={plan.map((p) => p.place)} numbered />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveMany(plan.map((p) => p.place))}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
        >
          <BookmarkPlus aria-hidden className="size-4" />
          {s.saveAll}
        </button>
      </div>
    </section>
  );
}
