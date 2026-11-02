"use server";
import { db } from "@/db";
import { entitlements, speakingSubmissions, subscriptions } from "@/db/schema";
import { getActor, signOut } from "@/lib/auth/session";
import { isPremiumSubscriptionStatus } from "@/lib/billing/rules";
import { cancelSubscriptionNow, getStripeConfig } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

/** Tables that carry a user_id owner column (no FK cascade), cleared on account deletion. */
const OWNER_TABLES = [
  "responses",
  "attempts",
  "practice_sessions",
  "mastery_records",
  "review_queue",
  "bookmarks",
  "mistakes",
  "vocabulary_progress",
  "writing_submissions",
  "speaking_submissions",
  "study_plans",
  "profiles",
  "exam_goals",
  "analytics_events",
  "issue_reports",
  "usage_counters",
];

export async function deleteAccountAction(): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") redirect("/");
  const userId = actor.kind === "user" ? actor.userId : "";

  // A live Stripe subscription must be stopped first, or the card keeps being charged for an
  // account that no longer exists. If Stripe can't be reached, abort rather than orphan it.
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (
    sub?.provider === "stripe" &&
    sub.providerSubscriptionId &&
    isPremiumSubscriptionStatus(sub.status)
  ) {
    let canceled = false;
    if (getStripeConfig()) {
      try {
        await cancelSubscriptionNow(sub.providerSubscriptionId);
        canceled = true;
      } catch (e) {
        logger.error("billing: could not cancel subscription before account deletion", {
          userId,
          error: (e as Error).message,
        });
      }
    }
    if (!canceled) redirect("/settings?billing=delete_blocked");
  }

  // purge stored speaking recordings (derived data) from object storage first
  const recordings = await db
    .select({ audioFile: speakingSubmissions.audioFile })
    .from(speakingSubmissions)
    .where(eq(speakingSubmissions.userId, userId));
  const storage = getStorage();
  for (const r of recordings) {
    if (r.audioFile) await storage.remove(r.audioFile).catch(() => {});
  }

  await db.transaction(async (tx) => {
    // writing/speaking feedback via submissions cascade; delete submissions' feedback first
    await tx.execute(
      sql`DELETE FROM writing_feedback WHERE submission_id IN (SELECT id FROM writing_submissions WHERE user_id = ${userId})`,
    );
    await tx.execute(
      sql`DELETE FROM speaking_feedback WHERE submission_id IN (SELECT id FROM speaking_submissions WHERE user_id = ${userId})`,
    );
    for (const table of OWNER_TABLES) {
      await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE user_id = ${userId}`);
    }
    // FK-cascade tables (auth_sessions, subscriptions, entitlements, accounts) go with the user
    await tx.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  });

  await signOut();
  redirect("/?deleted=1");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

/**
 * Cancel a locally granted Premium (dev simulator only). Paid Stripe access is never touched
 * here — real subscriptions are cancelled in the Stripe Customer Portal (so billing stops too),
 * and a paid one-time pass simply runs out.
 */
export async function cancelSubscriptionAction(): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") redirect("/");
  const userId = actor.userId;
  await db
    .update(subscriptions)
    .set({ plan: "free", status: "canceled", updatedAt: new Date() })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.provider, "simulator")));
  await db
    .delete(entitlements)
    .where(and(eq(entitlements.userId, userId), eq(entitlements.source, "simulator")));
  redirect("/settings?canceled=1");
}
