"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { useApp } from "@/components/chat/ConciergeContext";
import { DiscoverRails } from "@/components/welcome/DiscoverRails";
import { Onboarding } from "@/components/welcome/Onboarding";
import { fill } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

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
    { emoji: "💎", label: s.chipGems, prompt: s.promptGems },
    { emoji: "🗓️", label: s.chipPlan, prompt: s.promptPlan },
    { emoji: "🎟️", label: s.chipBook, prompt: s.promptBook },
    { emoji: "🛎️", label: s.chipServices, prompt: s.promptServices },
  ];

  return (
    <div className="space-y-8 px-4 pb-6 pt-8">
      <div className="rise text-center">
        <h2 className="text-balance font-display text-[40px] italic leading-[1.05]">
          {fill(s.greeting, { hotel: hotel.name })}
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-balance text-[15px] leading-relaxed text-muted">
          {s.welcomeSub}
        </p>
      </div>

      <nav aria-label={s.chipGems} className="space-y-3">
        {menu.map(({ emoji, label, prompt }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => sendText(prompt)}
            style={{ animationDelay: `${120 + i * 70}ms` }}
            className="pc-chip rise group min-h-14 w-full justify-start gap-4 px-5 text-base text-ink"
          >
            <span aria-hidden className="text-2xl leading-none">
              {emoji}
            </span>
            <span className="pc-title flex-1 text-start text-[15px]">{label}</span>
            <ChevronRight
              aria-hidden
              className="size-5 text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </button>
        ))}
      </nav>

      <DiscoverRails />

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onRequestLocation}
          disabled={Boolean(userLocation)}
          className="pc-chip"
          aria-pressed={Boolean(userLocation)}
        >
          <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
          {userLocation ? s.locationOn : s.useLocation}
        </button>
        <p className="text-xs text-muted">{s.curatedNote}</p>
      </div>

      {/* Wait for the local copy so saved preferences never flash the empty form. */}
      {ready && <Onboarding profile={profile} onSaved={onProfile} />}
    </div>
  );
}
