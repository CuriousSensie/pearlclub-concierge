"use client";

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
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-xl leading-none">{hotel.name}</h1>
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {s.demo}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted">{s.poweredBy}</p>
        </div>
        <LanguageSelector value={lang} label={s.language} onChange={onLanguage} />
        <button
          type="button"
          onClick={onOpenTrip}
          className="relative h-9 shrink-0 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-ink"
        >
          {s.myTrip}
          {tripCount > 0 && (
            <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1 text-xs">
              {tripCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
