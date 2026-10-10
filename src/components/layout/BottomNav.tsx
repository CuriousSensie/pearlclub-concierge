"use client";

import { Plus } from "lucide-react";
import { LANGUAGES, isLanguage } from "@/lib/i18n";
import { useApp } from "@/components/chat/ConciergeContext";
import type { Language } from "@/lib/types";

/**
 * Pearl Club's mobile tab bar: emoji tabs and a gradient circular centre action.
 * Phones only; on larger screens the header carries Language and My Trip.
 */
export function BottomNav({
  tripCount,
  onOpenTrip,
  onLanguage,
}: {
  tripCount: number;
  onOpenTrip: () => void;
  onLanguage: (lang: Language) => void;
}) {
  const { lang, s, sendText } = useApp();
  const tab =
    "flex h-14 w-14 flex-col items-center justify-center rounded-xl text-[22px] leading-none transition-colors active:bg-strip";
  return (
    <nav
      aria-label={s.concierge}
      className="flex items-center justify-around border-t border-line bg-white px-2 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <button
        type="button"
        className={tab}
        aria-label={s.chipGems}
        onClick={() => sendText(s.promptGems)}
      >
        <span aria-hidden>💎</span>
      </button>
      <button
        type="button"
        className={tab}
        aria-label={s.chipPlan}
        onClick={() => sendText(s.promptPlan)}
      >
        <span aria-hidden>🗓️</span>
      </button>
      <button
        type="button"
        aria-label={s.placeholder}
        onClick={() => document.getElementById("composer")?.focus()}
        className="pc-ring -mt-3 size-14 shadow-[var(--shadow-card)]"
      >
        <span className="flex size-full items-center justify-center rounded-full bg-white">
          <Plus aria-hidden className="size-6" strokeWidth={2} />
        </span>
      </button>
      <button
        type="button"
        className={`${tab} relative`}
        aria-label={tripCount ? `${s.myTrip} (${tripCount})` : s.myTrip}
        onClick={onOpenTrip}
      >
        <span aria-hidden>🧳</span>
        {tripCount > 0 && (
          <span className="absolute end-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-[var(--grad-red)] text-[11px] font-bold text-white">
            {tripCount}
          </span>
        )}
      </button>
      <label className={`${tab} relative`}>
        <span className="sr-only">{s.language}</span>
        <span aria-hidden>🌐</span>
        <select
          value={lang}
          onChange={(e) => isLanguage(e.target.value) && onLanguage(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
