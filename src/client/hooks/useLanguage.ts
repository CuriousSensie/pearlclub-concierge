"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/client/api";
import { isLanguage, isRTL } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const KEY = "pc_language";

function readStored(): Language | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return isLanguage(value) ? value : null;
  } catch (err) {
    console.warn("could not read language", err);
    return null;
  }
}

/** The guest's language: restored from this browser, applied to <html lang dir>, synced to their profile. */
export function useLanguage() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    // Reading localStorage must wait for the client to avoid a hydration mismatch.
    const stored = readStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setLang(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  }, [lang]);

  const change = useCallback((next: Language) => {
    setLang(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch (err) {
      console.warn("could not persist language", err);
    }
    api.profile
      .update({ language: next })
      .catch((err) => console.error("language sync failed", err));
  }, []);

  /** Uses a language saved on the server unless the guest already picked one in this browser. */
  const adoptIfUnset = useCallback((next: Language) => {
    if (readStored() === null) setLang(next);
  }, []);

  return { lang, change, adoptIfUnset };
}
