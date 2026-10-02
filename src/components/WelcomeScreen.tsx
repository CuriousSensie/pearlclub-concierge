"use client";

import { useApp } from "./AppContext";
import { Onboarding } from "./Onboarding";
import { fill } from "@/lib/i18n";
import type { Profile } from "@/types";

export function WelcomeScreen({
  profile,
  onProfile,
  onRequestLocation,
}: {
  profile: Profile | null;
  onProfile: (p: Profile) => void;
  onRequestLocation: () => void;
}) {
  const { hotel, s, sendText, userLocation } = useApp();
  const chips = [
    { icon: "💎", label: s.chipGems, prompt: s.promptGems },
    { icon: "🗓️", label: s.chipPlan, prompt: s.promptPlan },
    { icon: "🎟️", label: s.chipBook, prompt: s.promptBook },
    { icon: "🛎️", label: s.chipServices, prompt: s.promptServices },
  ];

  return (
    <div className="space-y-6 px-4 pb-6 pt-8">
      <div className="rise flex flex-col items-center text-center">
        <div aria-hidden className="pearl h-20 w-20 rounded-full" />
        <h2 className="mt-5 font-display text-4xl leading-tight">
          {fill(s.greeting, { hotel: hotel.name })}
        </h2>
        <p className="mt-2 max-w-sm text-balance text-[15px] text-muted">{s.welcomeSub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {chips.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => sendText(c.prompt)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="rise flex min-h-24 flex-col items-start justify-between rounded-2xl border border-line bg-card p-4 text-start shadow-[var(--shadow)] transition-transform active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden>
              {c.icon}
            </span>
            <span className="text-[15px] font-medium leading-snug">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onRequestLocation}
          disabled={Boolean(userLocation)}
          className="h-9 rounded-full border border-line bg-card px-4 text-sm disabled:text-accent"
        >
          📍 {userLocation ? s.locationOn : s.useLocation}
        </button>
        <p className="text-xs text-muted">{s.curatedNote}</p>
      </div>

      <Onboarding profile={profile} onSaved={onProfile} />
    </div>
  );
}
