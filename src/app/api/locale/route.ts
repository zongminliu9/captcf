import { type NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/** Set the UI locale cookie and redirect back (works without client JS). */
export function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("l");
  const next = req.nextUrl.searchParams.get("next") || req.headers.get("referer") || "/";
  const res = NextResponse.redirect(new URL(safePath(next, req), req.url));
  if (isLocale(l)) {
    res.cookies.set(LOCALE_COOKIE, l, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  return res;
}

/** Only allow same-origin relative redirects. */
function safePath(next: string, req: NextRequest): string {
  try {
    const url = new URL(next, req.url);
    if (url.origin === req.nextUrl.origin) return url.pathname + url.search;
  } catch {}
  return "/";
}
