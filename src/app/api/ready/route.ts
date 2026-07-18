import { db } from "@/db";
import { logger } from "@/lib/logger";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Readiness: dependencies (the database) are reachable. Used by load balancers/orchestrators. */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ready", db: "up" });
  } catch (e) {
    logger.error("readiness check failed", { error: (e as Error).message });
    return NextResponse.json({ status: "not_ready", db: "down" }, { status: 503 });
  }
}
