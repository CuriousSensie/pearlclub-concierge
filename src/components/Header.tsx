"use client";

import { Luggage } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useApp } from "./AppContext";
import type { Language } from "@/types";

export function Header({
  tripCount,
  onOpenTrip,
  onLanguage,
}: {
  tripCount: number;
  onOpenTrip: () => void;
  onLanguage: (lang: Language) => void;
}) {
  const { hotel, lang, s } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl leading-none sm:text-[22px]">
            {hotel.name}
          </h1>
          <p className="mt-1.5 truncate text-[11px] text-muted">
            {s.demo} · {s.poweredBy}
          </p>
        </div>
        <LanguageSelector value={lang} label={s.language} onChange={onLanguage} />
        <button
          type="button"
          onClick={onOpenTrip}
          aria-label={tripCount ? `${s.myTrip} (${tripCount})` : s.myTrip}
          className="relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-accent-ink sm:px-4"
        >
          <Luggage aria-hidden className="size-[18px]" />
          <span className="hidden sm:inline">{s.myTrip}</span>
          {tripCount > 0 && (
            <span className="absolute -end-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
              {tripCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
