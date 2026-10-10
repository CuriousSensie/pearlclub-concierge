import type { Language } from "@/lib/types";

export const LANGUAGES: { code: Language; name: string; flag: string; english: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧", english: "English" },
  { code: "es", name: "Español", flag: "🇪🇸", english: "Spanish" },
  { code: "fr", name: "Français", flag: "🇫🇷", english: "French" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", english: "German" },
  { code: "ar", name: "العربية", flag: "🇸🇦", english: "Arabic" },
  { code: "ur", name: "اردو", flag: "🇵🇰", english: "Urdu" },
];

export const isLanguage = (v: unknown): v is Language => LANGUAGES.some((l) => l.code === v);
export const isRTL = (lang: Language): boolean => lang === "ar" || lang === "ur";
export const languageEnglishName = (lang: Language): string =>
  LANGUAGES.find((l) => l.code === lang)?.english ?? "English";
