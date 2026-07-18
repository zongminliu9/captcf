import "server-only";
import { and, eq, gt, lte, or, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, reviewQueue, subscriptions } from "@/db/schema";
import { type Actor, ownerEq } from "@/lib/auth/owner";
import type { Plan } from "./index";

/** Effective plan: premium if an active premium subscription OR a live entitlement exists. */
export async function getPlanForActor(actor: Actor | null): Promise<Plan> {
  if (!actor || actor.kind !== "user") return "free";

  const subs = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, actor.userId))
    .limit(1);
  if (subs[0]?.plan === "premium" && subs[0].status === "active") return "premium";

  const ent = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, actor.userId),
        eq(entitlements.plan, "premium"),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, new Date())),
      ),
    )
    .limit(1);
  return ent[0] ? "premium" : "free";
}

export async function dueReviewCount(actor: Actor | null): Promise<number> {
  if (!actor) return 0;
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviewQueue)
    .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, new Date())));
  return rows[0]?.n ?? 0;
}
