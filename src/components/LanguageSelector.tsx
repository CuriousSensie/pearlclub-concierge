"use client";

import { Globe } from "lucide-react";
import { LANGUAGES, isLanguage } from "@/lib/i18n";
import type { Language } from "@/types";

export function LanguageSelector({
  value,
  label,
  onChange,
}: {
  value: Language;
  label: string;
  onChange: (lang: Language) => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <Globe aria-hidden className="pointer-events-none absolute start-2.5 size-4 text-muted" />
      <select
        value={value}
        onChange={(e) => isLanguage(e.target.value) && onChange(e.target.value)}
        className="h-10 appearance-none rounded-full border border-line bg-card ps-8 pe-3 text-sm text-ink"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
