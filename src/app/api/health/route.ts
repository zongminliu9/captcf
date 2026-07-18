import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness: the process is up and serving. Cheap, no dependencies. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "captcf", time: new Date().toISOString() });
}
