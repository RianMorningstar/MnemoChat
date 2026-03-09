import "i18next";

// Strict per-namespace typing conflicts with cross-namespace key syntax
// (e.g., t("common:action.save") from a "settings" useTranslation).
// We declare defaultNS only, keeping t() flexible for cross-namespace use.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
  }
}
