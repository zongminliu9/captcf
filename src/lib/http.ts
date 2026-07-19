import { NextResponse } from "next/server";

/**
 * Redirect to a RELATIVE path with a relative `Location` header.
 *
 * Why not `NextResponse.redirect(new URL(path, req.url))`? Behind a reverse proxy
 * (Render, Fly, etc.) `req.url` is the INTERNAL origin the app listens on
 * (e.g. http://localhost:10000), so an absolute redirect sends the browser to
 * localhost. A relative `Location` is resolved by the browser against the real
 * public origin it requested — correct on any host, proxied or not.
 */
export function redirectTo(path: string, status: 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
