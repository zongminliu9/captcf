import "server-only";
import { db } from "@/db";
import { attempts, practiceSessions } from "@/db/schema";
import { type Actor, ownerEq } from "@/lib/auth/owner";
import { and, gte, inArray, sql } from "drizzle-orm";
import type { Plan } from "./index";
import { withinDailyLimit } from "./index";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function practiceSessionsToday(actor: Actor): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(practiceSessions)
    .where(
      and(
        ownerEq(practiceSessions, actor),
        inArray(practiceSessions.mode, ["quick", "custom", "listening", "reading", "diagnostic"]),
        gte(practiceSessions.createdAt, startOfToday()),
      ),
    );
  return rows[0]?.n ?? 0;
}

export async function mockAttemptsToday(actor: Actor): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(attempts)
    .where(and(ownerEq(attempts, actor), gte(attempts.createdAt, startOfToday())));
  return rows[0]?.n ?? 0;
}

/** Returns null if allowed, or a reason string if the daily free limit is reached. */
export async function checkPracticeAllowed(actor: Actor, plan: Plan): Promise<string | null> {
  if (plan === "premium") return null;
  const used = await practiceSessionsToday(actor);
  const check = withinDailyLimit("free", "practice", used);
  return check.allowed ? null : "daily_practice_limit";
}
