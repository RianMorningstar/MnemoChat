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

function loadJson(lang: string, ns: string): Record<string, string> {
  const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getInterpolationVars(value: string): string[] {
  return (value.match(/\{\{(\w+)\}\}/g) || []).sort();
}

describe("i18n translation completeness", () => {
  for (const ns of NAMESPACES) {
    describe(`${ns} namespace`, () => {
      it(`es/${ns}.json has all keys from en/${ns}.json`, () => {
        const en = loadJson("en", ns);
        const es = loadJson("es", ns);
        const missingKeys = Object.keys(en).filter((k) => !(k in es));
        expect(missingKeys, `Missing keys in es/${ns}.json`).toEqual([]);
      });

      it(`es/${ns}.json has no extra keys missing from en/${ns}.json`, () => {
        const en = loadJson("en", ns);
        const es = loadJson("es", ns);
        const extraKeys = Object.keys(es).filter((k) => !(k in en));
        expect(extraKeys, `Extra keys in es/${ns}.json not in en/${ns}.json`).toEqual([]);
      });

      it(`es/${ns}.json has matching interpolation variables`, () => {
        const en = loadJson("en", ns);
        const es = loadJson("es", ns);
        for (const key of Object.keys(en)) {
          if (!(key in es)) continue;
          const enVars = getInterpolationVars(en[key]);
          const esVars = getInterpolationVars(es[key]);
          expect(esVars, `Key "${key}" in ${ns}`).toEqual(enVars);
        }
      });

      it(`en/${ns}.json has no empty string values`, () => {
        const en = loadJson("en", ns);
        const emptyKeys = Object.entries(en)
          .filter(([, v]) => v.trim() === "")
          .map(([k]) => k);
        expect(emptyKeys, `Empty values in en/${ns}.json`).toEqual([]);
      });

      it(`es/${ns}.json has no empty string values`, () => {
        const es = loadJson("es", ns);
        const emptyKeys = Object.entries(es)
          .filter(([, v]) => v.trim() === "")
          .map(([k]) => k);
        expect(emptyKeys, `Empty values in es/${ns}.json`).toEqual([]);
      });
    });
  }
});
