"use server";
import { db } from "@/db";
import { bookmarks, issueReports, reviewQueue } from "@/db/schema";
import { ownerEq, ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { INITIAL_SM2, review } from "@/lib/review/sm2";
import { and, eq } from "drizzle-orm";

export async function toggleBookmark(questionId: string): Promise<{ bookmarked: boolean }> {
  const actor = await ensureActor();
  const existing = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(ownerEq(bookmarks, actor), eq(bookmarks.questionId, questionId)))
    .limit(1);
  if (existing[0]) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
    return { bookmarked: false };
  }
  await db
    .insert(bookmarks)
    .values({ ...ownerValues(actor), questionId })
    .onConflictDoNothing();
  return { bookmarked: true };
}

export async function addToReview(questionId: string): Promise<{ added: true }> {
  const actor = await ensureActor();
  const next = review(INITIAL_SM2, 3, new Date());
  await db
    .insert(reviewQueue)
    .values({ ...ownerValues(actor), questionId, sm2: next, dueAt: next.dueAt, source: "manual" })
    .onConflictDoNothing();
  return { added: true };
}

export async function reportIssue(input: {
  refType: string;
  refId: string;
  category: string;
  message: string;
}): Promise<{ reported: true }> {
  const actor = await ensureActor();
  await db.insert(issueReports).values({
    ...ownerValues(actor),
    refType: input.refType,
    refId: input.refId,
    category: input.category,
    message: input.message.slice(0, 2000),
  });
  return { reported: true };
}
