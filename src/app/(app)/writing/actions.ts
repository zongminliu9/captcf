"use server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { writingFeedback, writingSubmissions, writingTasks } from "@/db/schema";
import { ownerEq, ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { analyzeWriting, type WritingAnalysis } from "@/lib/writing/analyze";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

async function findDraft(actorFilterFor: Parameters<typeof ownerEq>[1], taskId: string) {
  const rows = await db
    .select()
    .from(writingSubmissions)
    .where(
      and(
        ownerEq(writingSubmissions, actorFilterFor),
        eq(writingSubmissions.taskId, taskId),
        eq(writingSubmissions.status, "draft"),
      ),
    )
    .orderBy(desc(writingSubmissions.updatedAt))
    .limit(1);
  return rows[0];
}

export async function saveWritingDraft(
  taskId: string,
  text: string,
  timeSpentSeconds: number,
): Promise<{ submissionId: string }> {
  const actor = await ensureActor();
  const existing = await findDraft(actor, taskId);
  if (existing) {
    await db
      .update(writingSubmissions)
      .set({ text, wordCount: countWords(text), timeSpentSeconds, updatedAt: new Date() })
      .where(eq(writingSubmissions.id, existing.id));
    return { submissionId: existing.id };
  }
  const [row] = await db
    .insert(writingSubmissions)
    .values({ ...ownerValues(actor), taskId, text, wordCount: countWords(text), timeSpentSeconds, status: "draft" })
    .returning({ id: writingSubmissions.id });
  return { submissionId: row!.id };
}

export async function submitWriting(
  taskId: string,
  text: string,
  timeSpentSeconds: number,
): Promise<{ submissionId: string; analysis: WritingAnalysis; modelAnswerFr: string }> {
  const actor = await ensureActor();
  const [task] = await db.select().from(writingTasks).where(eq(writingTasks.id, taskId)).limit(1);
  if (!task) throw new Error("Task not found");

  const analysis = analyzeWriting(text, {
    keywords: task.keywords,
    minWords: task.minWords,
    maxWords: task.maxWords,
    taskNumber: task.taskNumber,
  });

  const existing = await findDraft(actor, taskId);
  let submissionId: string;
  if (existing) {
    await db
      .update(writingSubmissions)
      .set({
        text,
        wordCount: analysis.wordCount,
        timeSpentSeconds,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(writingSubmissions.id, existing.id));
    submissionId = existing.id;
  } else {
    const [row] = await db
      .insert(writingSubmissions)
      .values({
        ...ownerValues(actor),
        taskId,
        text,
        wordCount: analysis.wordCount,
        timeSpentSeconds,
        status: "submitted",
        submittedAt: new Date(),
      })
      .returning({ id: writingSubmissions.id });
    submissionId = row!.id;
  }

  await db.insert(writingFeedback).values({
    submissionId,
    source: "local",
    rubric: analysis,
    summary: analysis.summaryFr,
  });

  return { submissionId, analysis, modelAnswerFr: task.modelAnswerFr };
}
