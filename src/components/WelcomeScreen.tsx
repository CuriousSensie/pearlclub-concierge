"use client";

import { CalendarDays, ChevronRight, ConciergeBell, Gem, MapPin, Ticket } from "lucide-react";
import { useApp } from "./AppContext";
import { DiscoverRails } from "./DiscoverRails";
import { Onboarding } from "./Onboarding";
import { fill } from "@/lib/i18n";
import type { Profile } from "@/types";

export function WelcomeScreen({
  ready,
  profile,
  onProfile,
  onRequestLocation,
}: {
  ready: boolean;
  profile: Profile | null;
  onProfile: (p: Profile) => void;
  onRequestLocation: () => void;
}) {
  const { hotel, s, sendText, userLocation } = useApp();
  const menu = [
    { Icon: Gem, label: s.chipGems, prompt: s.promptGems },
    { Icon: CalendarDays, label: s.chipPlan, prompt: s.promptPlan },
    { Icon: Ticket, label: s.chipBook, prompt: s.promptBook },
    { Icon: ConciergeBell, label: s.chipServices, prompt: s.promptServices },
  ];

  return (
    <div className="space-y-7 px-4 pb-8 pt-9">
      <div className="rise flex flex-col items-center text-center">
        <div aria-hidden className="pearl size-24 rounded-full" />
        <h2 className="mt-6 text-balance font-display text-[40px] leading-[1.05]">
          {fill(s.greeting, { hotel: hotel.name })}
        </h2>
        <p className="mt-3 max-w-xs text-balance text-[15px] leading-relaxed text-muted">
          {s.welcomeSub}
        </p>
      </div>

      <nav aria-label={s.chipGems} className="space-y-2.5">
        {menu.map(({ Icon, label, prompt }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => sendText(prompt)}
            style={{ animationDelay: `${120 + i * 70}ms` }}
            className="rise group flex w-full items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3.5 text-start transition-colors hover:border-accent/50 active:bg-accent/5"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent-text">
              <Icon aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-base font-medium">{label}</span>
            <ChevronRight
              aria-hidden
              className="size-5 text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </button>
        ))}
      </nav>

      <DiscoverRails />

      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onRequestLocation}
          disabled={Boolean(userLocation)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm disabled:text-accent-text"
        >
          <MapPin aria-hidden className="size-4" />
          {userLocation ? s.locationOn : s.useLocation}
        </button>
        <p className="text-xs text-muted">{s.curatedNote}</p>
      </div>

      {/* Wait for the local copy so saved preferences never flash the empty form. */}
      {ready && <Onboarding profile={profile} onSaved={onProfile} />}
    </div>
  );
}
