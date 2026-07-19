import { redirectTo } from "@/lib/http";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import type { NextRequest } from "next/server";

/** Set the UI locale cookie and redirect back (works without client JS). */
export function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("l");
  const next = req.nextUrl.searchParams.get("next") || req.headers.get("referer") || "/";
  const res = redirectTo(safePath(next));
  if (isLocale(l)) {
    res.cookies.set(LOCALE_COOKIE, l, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  return res;
}

/** Reduce any target to a same-origin relative path (we only ever emit a relative Location). */
function safePath(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  try {
    const u = new URL(next);
    return u.pathname + u.search;
  } catch {}
  return "/";
}
