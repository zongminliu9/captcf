"use server";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getActor } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/session";

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
