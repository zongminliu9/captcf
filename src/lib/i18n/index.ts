import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES } from "./dictionaries";

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

/**
 * Build a translator for a locale. Missing keys fall back to French, then to the
 * key itself — so a partial translation never renders a raw dotted key.
 */
export function createT(locale: Locale): TFn {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const fallback = DICTIONARIES[DEFAULT_LOCALE];
  return (key, vars) => {
    const template = dict[key] ?? fallback[key] ?? key;
    return interpolate(template, vars);
  };
}

export { DEFAULT_LOCALE };
export type { Locale };
