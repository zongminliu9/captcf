import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { createT, type TFn } from "./index";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<{ locale: Locale; t: TFn }> {
  const locale = await getLocale();
  return { locale, t: createT(locale) };
}
