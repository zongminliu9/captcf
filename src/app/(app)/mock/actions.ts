"use server";
import { db } from "@/db";
import { writingFeedback, writingSubmissions, writingTasks } from "@/db/schema";
import { ownerEq, ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { advanceMockSection, startMockSection } from "@/lib/practice/mock";
import { recordResponse } from "@/lib/practice/session";
import { analyzeWriting } from "@/lib/writing/analyze";
import { and, eq } from "drizzle-orm";

export async function startMockSectionAction(sessionId: string): Promise<void> {
  const actor = await ensureActor();
  await startMockSection(actor, sessionId);
}

export async function answerMock(
  sessionId: string,
  input: { refId: string; selectedAnswer: string | null; responseMs?: number },
): Promise<{ ok: true }> {
  const actor = await ensureActor();
  await recordResponse(actor, sessionId, input);
  return { ok: true };
}

/** Save the writing section's answers (one submission + local feedback per task). */
export async function saveMockWriting(
  sessionId: string,
  entries: { taskId: string; text: string }[],
): Promise<{ ok: true }> {
  const actor = await ensureActor();
  for (const entry of entries) {
    const [task] = await db
      .select()
      .from(writingTasks)
      .where(eq(writingTasks.id, entry.taskId))
      .limit(1);
    if (!task) continue;
    const analysis = analyzeWriting(entry.text, {
      keywords: task.keywords,
      minWords: task.minWords,
      maxWords: task.maxWords,
      taskNumber: task.taskNumber,
    });
    // one submission per (session, task)
    const existing = await db
      .select({ id: writingSubmissions.id })
      .from(writingSubmissions)
      .where(
        and(
          ownerEq(writingSubmissions, actor),
          eq(writingSubmissions.sessionId, sessionId),
          eq(writingSubmissions.taskId, entry.taskId),
        ),
      )
      .limit(1);
    let submissionId: string;
    if (existing[0]) {
      submissionId = existing[0].id;
      await db
        .update(writingSubmissions)
        .set({
          text: entry.text,
          wordCount: analysis.wordCount,
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(writingSubmissions.id, submissionId));
      await db.delete(writingFeedback).where(eq(writingFeedback.submissionId, submissionId));
    } else {
      const [row] = await db
        .insert(writingSubmissions)
        .values({
          ...ownerValues(actor),
          taskId: entry.taskId,
          sessionId,
          text: entry.text,
          wordCount: analysis.wordCount,
          status: "submitted",
          submittedAt: new Date(),
        })
        .returning({ id: writingSubmissions.id });
      submissionId = row!.id;
    }
    await db
      .insert(writingFeedback)
      .values({ submissionId, source: "local", rubric: analysis, summary: analysis.summaryFr });
  }
  return { ok: true };
}

export async function advanceMock(
  sessionId: string,
): Promise<{ done: boolean; attemptId?: string }> {
  const actor = await ensureActor();
  return advanceMockSection(actor, sessionId);
}
