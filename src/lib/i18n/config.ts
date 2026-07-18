export const LOCALES = ["fr", "en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "captcf_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  zh: "简体中文",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}
