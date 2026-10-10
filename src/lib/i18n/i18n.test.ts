import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, SERVICE_IDS } from "../domain";
import { STRINGS, fill, isLanguage, isRTL, t } from "./index";
import type { Strings } from "./types";

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Every user-visible string, flattened with a readable path. */
function flatten(strings: Strings): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(strings, "");
  return out;
}

const english = flatten(STRINGS.en);

describe("translations", () => {
  it("covers every language code", () => {
    expect(Object.keys(STRINGS).sort()).toEqual([...LANGUAGE_CODES].sort());
  });

  it.each(LANGUAGE_CODES.filter((l) => l !== "en"))(
    "%s has exactly the same keys as English",
    (lang) => {
      expect(Object.keys(flatten(STRINGS[lang])).sort()).toEqual(Object.keys(english).sort());
    },
  );

  it.each(LANGUAGE_CODES)("%s has no empty strings", (lang) => {
    for (const [key, value] of Object.entries(flatten(STRINGS[lang]))) {
      expect(value.trim(), `${lang}.${key}`).not.toBe("");
    }
  });

  it.each(LANGUAGE_CODES)("%s keeps the same {placeholders} as English", (lang) => {
    const strings = flatten(STRINGS[lang]);
    for (const [key, base] of Object.entries(english)) {
      expect(placeholders(strings[key]), `${lang}.${key}`).toEqual(placeholders(base));
    }
  });

  it("defines every hotel service in every language", () => {
    for (const lang of LANGUAGE_CODES) {
      for (const id of SERVICE_IDS) expect(STRINGS[lang].services[id].name).toBeTruthy();
    }
  });
});

describe("helpers", () => {
  it("fill replaces placeholders and blanks unknown ones", () => {
    expect(fill("Hi {name}, {missing}!", { name: "Sam" })).toBe("Hi Sam, !");
  });

  it("isLanguage / isRTL", () => {
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("ur")).toBe(true);
    expect(isRTL("en")).toBe(false);
  });

  it("t falls back to English for an unknown language", () => {
    expect(t("zz" as never)).toBe(STRINGS.en);
  });
});
