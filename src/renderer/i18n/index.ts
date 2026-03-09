import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getSetting } from "@/lib/api";

import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import it from "./locales/it";
import pt from "./locales/pt";
import nl from "./locales/nl";
import pl from "./locales/pl";
import cs from "./locales/cs";
import sk from "./locales/sk";
import hu from "./locales/hu";
import ro from "./locales/ro";
import bg from "./locales/bg";
import hr from "./locales/hr";
import sl from "./locales/sl";
import sr from "./locales/sr";
import uk from "./locales/uk";
import ru from "./locales/ru";
import et from "./locales/et";
import lv from "./locales/lv";
import lt from "./locales/lt";
import fi from "./locales/fi";
import sv from "./locales/sv";
import da from "./locales/da";
import nb from "./locales/nb";
import is_ from "./locales/is";
import el from "./locales/el";
import tr from "./locales/tr";
import ar from "./locales/ar";
import he from "./locales/he";
import hi from "./locales/hi";
import th from "./locales/th";
import vi from "./locales/vi";
import id from "./locales/id";
import ms from "./locales/ms";
import zh from "./locales/zh";
import ja from "./locales/ja";
import ko from "./locales/ko";

const LANGUAGES = {
  en: { label: "English", resources: en },
  es: { label: "Español", resources: es },
  fr: { label: "Français", resources: fr },
  de: { label: "Deutsch", resources: de },
  it: { label: "Italiano", resources: it },
  pt: { label: "Português", resources: pt },
  nl: { label: "Nederlands", resources: nl },
  pl: { label: "Polski", resources: pl },
  cs: { label: "Čeština", resources: cs },
  sk: { label: "Slovenčina", resources: sk },
  hu: { label: "Magyar", resources: hu },
  ro: { label: "Română", resources: ro },
  bg: { label: "Български", resources: bg },
  hr: { label: "Hrvatski", resources: hr },
  sl: { label: "Slovenščina", resources: sl },
  sr: { label: "Српски", resources: sr },
  uk: { label: "Українська", resources: uk },
  ru: { label: "Русский", resources: ru },
  et: { label: "Eesti", resources: et },
  lv: { label: "Latviešu", resources: lv },
  lt: { label: "Lietuvių", resources: lt },
  fi: { label: "Suomi", resources: fi },
  sv: { label: "Svenska", resources: sv },
  da: { label: "Dansk", resources: da },
  nb: { label: "Norsk", resources: nb },
  is: { label: "Íslenska", resources: is_ },
  el: { label: "Ελληνικά", resources: el },
  tr: { label: "Türkçe", resources: tr },
  ar: { label: "العربية", resources: ar },
  he: { label: "עברית", resources: he },
  hi: { label: "हिन्दी", resources: hi },
  th: { label: "ไทย", resources: th },
  vi: { label: "Tiếng Việt", resources: vi },
  id: { label: "Bahasa Indonesia", resources: id },
  ms: { label: "Bahasa Melayu", resources: ms },
  zh: { label: "简体中文", resources: zh },
  ja: { label: "日本語", resources: ja },
  ko: { label: "한국어", resources: ko },
} as const;

export type SupportedLanguage = keyof typeof LANGUAGES;

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] =
  Object.entries(LANGUAGES).map(([code, { label }]) => ({
    code: code as SupportedLanguage,
    label,
  }));

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as SupportedLanguage[];

function detectLanguage(locale: string): SupportedLanguage {
  const prefix = locale.split("-")[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(prefix)
    ? (prefix as SupportedLanguage)
    : "en";
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(LANGUAGES).map(([code, { resources }]) => [code, resources])
  ),
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: [
    "common",
    "settings",
    "chat",
    "characters",
    "dashboard",
    "library",
    "story",
    "onboarding",
  ],
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

/**
 * Load persisted language preference, falling back to system locale.
 * Call once at app startup.
 */
export async function initLanguage(): Promise<void> {
  try {
    const setting = await getSetting("ui_language");
    if (setting?.value) {
      await i18n.changeLanguage(setting.value);
      return;
    }
  } catch {
    // API may not be ready on first boot — fall through
  }

  // First launch: detect from system
  const systemLocale = navigator.language || "en";
  const lang = detectLanguage(systemLocale);
  await i18n.changeLanguage(lang);
}

export default i18n;
