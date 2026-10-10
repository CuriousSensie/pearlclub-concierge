import type { Language } from "@/lib/types";
import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import type { Strings } from "./types";
import { ur } from "./ur";

export { LANGUAGES, isLanguage, isRTL, languageEnglishName } from "./languages";
export type { Strings } from "./types";

export const STRINGS: Record<Language, Strings> = { en, es, fr, de, ar, ur };

export function t(lang: Language): Strings {
  return STRINGS[lang] ?? en;
}

/** Fill `{placeholders}` in a template string. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
