import "server-only";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { logger } from "@/lib/logger";
import { sql } from "drizzle-orm";

export interface RateResult {
  allowed: boolean;
  remaining: number;
}

/**
 * DB-backed fixed-window rate limiter — persistent and correct across multiple processes
 * (unlike an in-memory Map). `key` should identify the actor+action (e.g. "login:1.2.3.4").
 * Fails open (allowed) if the store is unreachable, so an outage never locks users out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  // Deterministic escape hatch for automated tests (never set in production).
  if (process.env.RATE_LIMIT_DISABLED === "1") return { allowed: true, remaining: limit };
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000)) * windowSec * 1000;
  const bucket = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowSec * 1000);
  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ bucket, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateLimits.bucket,
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });
    const count = row?.count ?? 1;
    // opportunistic cleanup of expired buckets
    if (count === 1) await db.delete(rateLimits).where(sql`${rateLimits.expiresAt} < now()`);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (e) {
    logger.warn("rate limiter unavailable, failing open", { error: (e as Error).message });
    return { allowed: true, remaining: limit };
  }
}

/** Best-effort client key from request headers (proxy-aware). */
export function clientKey(headers: Headers, action: string): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || headers.get("x-real-ip") || "local";
  return `${action}:${ip}`;
}
