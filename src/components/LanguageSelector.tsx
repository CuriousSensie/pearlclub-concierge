"use client";

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
      <select
        value={value}
        onChange={(e) => isLanguage(e.target.value) && onChange(e.target.value)}
        className="h-9 appearance-none rounded-full border border-line bg-card ps-3 pe-8 text-sm text-ink"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.name}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute end-3 text-[10px] text-muted">
        ▾
      </span>
    </label>
  );
}
