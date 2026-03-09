import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LOCALES_DIR = path.join(__dirname, "../../src/renderer/i18n/locales");
const NAMESPACES = [
  "common",
  "settings",
  "chat",
  "characters",
  "dashboard",
  "library",
  "story",
  "onboarding",
];

const LANGUAGES = [
  "en", "es", "fr", "de", "it", "pt", "nl", "pl",
  "cs", "sk", "hu", "ro", "bg", "hr", "sl", "sr",
  "uk", "ru", "et", "lv", "lt", "fi", "sv", "da",
  "nb", "is", "el", "tr", "ar", "he", "hi", "th",
  "vi", "id", "ms", "zh", "ja", "ko",
];

function loadJson(lang: string, ns: string): Record<string, string> {
  const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getInterpolationVars(value: string): string[] {
  return (value.match(/\{\{(\w+)\}\}/g) || []).sort();
}

describe("i18n translation completeness", () => {
  const nonEnLanguages = LANGUAGES.filter((l) => l !== "en");

  for (const ns of NAMESPACES) {
    describe(`${ns} namespace`, () => {
      it(`en/${ns}.json has no empty string values`, () => {
        const en = loadJson("en", ns);
        const emptyKeys = Object.entries(en)
          .filter(([, v]) => v.trim() === "")
          .map(([k]) => k);
        expect(emptyKeys, `Empty values in en/${ns}.json`).toEqual([]);
      });

      for (const lang of nonEnLanguages) {
        it(`${lang}/${ns}.json has all keys from en/${ns}.json`, () => {
          const en = loadJson("en", ns);
          const target = loadJson(lang, ns);
          const missingKeys = Object.keys(en).filter((k) => !(k in target));
          expect(missingKeys, `Missing keys in ${lang}/${ns}.json`).toEqual([]);
        });

        it(`${lang}/${ns}.json has matching interpolation variables`, () => {
          const en = loadJson("en", ns);
          const target = loadJson(lang, ns);
          for (const key of Object.keys(en)) {
            if (!(key in target)) continue;
            const enVars = getInterpolationVars(en[key]);
            const targetVars = getInterpolationVars(target[key]);
            expect(targetVars, `Key "${key}" in ${lang}/${ns}`).toEqual(enVars);
          }
        });
      }
    });
  }
});
