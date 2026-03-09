import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getSetting } from "@/lib/api";

// English
import enCommon from "./locales/en/common.json";
import enSettings from "./locales/en/settings.json";
import enChat from "./locales/en/chat.json";
import enCharacters from "./locales/en/characters.json";
import enDashboard from "./locales/en/dashboard.json";
import enLibrary from "./locales/en/library.json";
import enStory from "./locales/en/story.json";
import enOnboarding from "./locales/en/onboarding.json";

// Spanish
import esCommon from "./locales/es/common.json";
import esSettings from "./locales/es/settings.json";
import esChat from "./locales/es/chat.json";
import esCharacters from "./locales/es/characters.json";
import esDashboard from "./locales/es/dashboard.json";
import esLibrary from "./locales/es/library.json";
import esStory from "./locales/es/story.json";
import esOnboarding from "./locales/es/onboarding.json";

const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

function detectLanguage(locale: string): SupportedLanguage {
  const prefix = locale.split("-")[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(prefix)
    ? (prefix as SupportedLanguage)
    : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      settings: enSettings,
      chat: enChat,
      characters: enCharacters,
      dashboard: enDashboard,
      library: enLibrary,
      story: enStory,
      onboarding: enOnboarding,
    },
    es: {
      common: esCommon,
      settings: esSettings,
      chat: esChat,
      characters: esCharacters,
      dashboard: esDashboard,
      library: esLibrary,
      story: esStory,
      onboarding: esOnboarding,
    },
  },
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
