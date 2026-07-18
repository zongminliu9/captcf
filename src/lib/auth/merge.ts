import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Idempotently merge an anonymous guest's data into a user account.
 *
 * Strategy per owned table:
 *  - Tables with a per-owner unique key: move guest rows the user doesn't already
 *    have (NOT EXISTS guard), then delete any leftover conflicting guest rows.
 *  - Append-only tables: flip guest_id → user_id.
 * Re-running is a no-op: once moved, `guest_id` no longer matches, and the NOT EXISTS
 * guards prevent duplicate attempts/mistakes/bookmarks. Finally the guest session is
 * marked merged so it can never act as a guest again.
 */
export async function mergeGuestIntoUser(guestId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // one-per-owner records
    for (const table of ["profiles", "exam_goals"]) {
      await tx.execute(
        sql`UPDATE ${sql.identifier(table)} g SET user_id = ${userId}, guest_id = NULL
            WHERE g.guest_id = ${guestId}
              AND NOT EXISTS (SELECT 1 FROM ${sql.identifier(table)} u WHERE u.user_id = ${userId})`,
      );
      await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE guest_id = ${guestId}`);
    }

    // keyed uniques: (table, key columns)
    const keyed: [string, string[]][] = [
      ["mastery_records", ["skill", "subtype"]],
      ["review_queue", ["question_id"]],
      ["bookmarks", ["question_id"]],
      ["mistakes", ["question_id"]],
      ["vocabulary_progress", ["vocab_id"]],
    ];
    for (const [table, keys] of keyed) {
      const match = sql.join(
        keys.map((k) => sql`u.${sql.identifier(k)} = g.${sql.identifier(k)}`),
        sql` AND `,
      );
      await tx.execute(
        sql`UPDATE ${sql.identifier(table)} g SET user_id = ${userId}, guest_id = NULL
            WHERE g.guest_id = ${guestId}
              AND NOT EXISTS (SELECT 1 FROM ${sql.identifier(table)} u WHERE u.user_id = ${userId} AND ${match})`,
      );
      await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE guest_id = ${guestId}`);
    }

    // append-only owned tables: straight move
    for (const table of [
      "study_plans",
      "practice_sessions",
      "responses",
      "attempts",
      "writing_submissions",
      "speaking_submissions",
      "analytics_events",
      "issue_reports",
    ]) {
      await tx.execute(
        sql`UPDATE ${sql.identifier(table)} SET user_id = ${userId}, guest_id = NULL WHERE guest_id = ${guestId}`,
      );
    }

    // daily usage counters reset on merge (low-value, avoids PK conflicts)
    await tx.execute(sql`DELETE FROM usage_counters WHERE guest_id = ${guestId}`);

    // mark the guest merged so getActor() stops treating it as a live guest
    await tx.execute(
      sql`UPDATE guest_sessions SET merged_user_id = ${userId} WHERE id = ${guestId}`,
    );
  });
}
