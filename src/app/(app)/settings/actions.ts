"use server";
import { db } from "@/db";
import { entitlements, speakingSubmissions, subscriptions } from "@/db/schema";
import { getActor, signOut } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { eq, sql } from "drizzle-orm";
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

/** Cancel Premium: downgrade the subscription + remove entitlements. */
export async function cancelSubscriptionAction(): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") redirect("/");
  const userId = actor.userId;
  await db
    .update(subscriptions)
    .set({ plan: "free", status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
  await db.delete(entitlements).where(eq(entitlements.userId, userId));
  redirect("/settings?canceled=1");
}
