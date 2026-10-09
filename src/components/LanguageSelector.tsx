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
    <label className="pc-chip relative gap-2 ps-3 pe-2">
      <span className="sr-only">{label}</span>
      <Globe aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
      <select
        value={value}
        onChange={(e) => isLanguage(e.target.value) && onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pe-4 text-sm text-ink"
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
