"use client";

import { Luggage } from "lucide-react";
import Image from "next/image";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useApp } from "@/components/chat/ConciergeContext";
import type { Language } from "@/lib/types";

/** Pearl Club's header: white bar with the logo. Language and My Trip live in the bottom bar on phones. */
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
    <header className="sticky top-0 z-30 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-4 py-2 sm:h-20 sm:justify-between sm:py-0">
        <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-4">
          <Image
            src="/logos/pearlclub-dark.png"
            alt="Pearl Club"
            width={180}
            height={41}
            priority
            className="h-9 w-auto sm:h-10"
          />
          <p className="pc-title max-w-[70vw] truncate text-[11px] font-normal text-muted sm:border-s sm:border-line sm:ps-4 sm:text-xs">
            {s.concierge} · {hotel.name}
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <LanguageSelector value={lang} label={s.language} onChange={onLanguage} />
          <button type="button" onClick={onOpenTrip} className="pc-btn relative">
            <Luggage aria-hidden className="size-[18px]" />
            {s.myTrip}
            {tripCount > 0 && (
              <span className="absolute -end-2 -top-2 inline-flex size-5 items-center justify-center rounded-full bg-[var(--grad-red)] text-[11px] font-bold text-white">
                {tripCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
