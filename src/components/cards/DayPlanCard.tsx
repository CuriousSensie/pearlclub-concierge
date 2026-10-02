"use client";

import { useApp } from "../AppContext";
import { MapCard } from "./MapCard";
import { PlaceCard } from "./PlaceCard";
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
    <section className="space-y-3 rounded-2xl border border-line bg-card/60 p-3.5">
      {(theme || date) && (
        <h3 className="font-display text-xl">{[theme, date].filter(Boolean).join(" · ")}</h3>
      )}
      <ol className="space-y-4">
        {plan.map((stop, i) => (
          <li key={`${stop.place.id}-${i}`} className="relative ps-5">
            <span
              aria-hidden
              className="absolute start-0 top-1.5 h-2.5 w-2.5 rounded-full bg-accent"
            />
            {i < plan.length - 1 && (
              <span aria-hidden className="absolute start-[4px] top-4 -bottom-4 w-px bg-line" />
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {slotLabel[stop.time_slot]}
            </p>
            <p className="mb-2 text-sm text-ink/80">{stop.reason}</p>
            <PlaceCard place={stop.place} compact />
          </li>
        ))}
      </ol>
      <MapCard places={plan.map((p) => p.place)} numbered />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveMany(plan.map((p) => p.place))}
          className="h-9 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
        >
          {s.saveAll}
        </button>
        <button
          type="button"
          onClick={() => sendText("Swap one stop in my plan for something different.")}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium"
        >
          {s.swapStop}
        </button>
      </div>
    </section>
  );
}
