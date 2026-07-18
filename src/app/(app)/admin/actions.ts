"use server";
import { db } from "@/db";
import { issueReports, options, questionVersions, questions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";
import { readingItemSchema } from "@/lib/content/schema";
import { eq, inArray } from "drizzle-orm";

export async function updateQuestionStatus(
  id: string,
  status: "draft" | "in_review" | "published" | "retired",
): Promise<{ ok: true }> {
  const admin = await requireAdmin();
  const [before] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (before) {
    await db.insert(questionVersions).values({
      questionId: id,
      version: before.version,
      snapshot: before,
      editorUserId: admin.userId,
    });
  }
  await db.update(questions).set({ status, updatedAt: new Date() }).where(eq(questions.id, id));
  return { ok: true };
}

export async function updateQuestionFields(
  id: string,
  fields: { stem?: string; explanation?: string; options?: { id: string; text: string }[] },
): Promise<{ ok: true }> {
  const admin = await requireAdmin();
  const [before] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!before) throw new Error("not found");
  await db.insert(questionVersions).values({
    questionId: id,
    version: before.version,
    snapshot: before,
    editorUserId: admin.userId,
  });
  await db
    .update(questions)
    .set({
      stem: fields.stem ?? before.stem,
      explanation: fields.explanation ?? before.explanation,
      version: before.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, id));
  if (fields.options) {
    for (const opt of fields.options) {
      await db.update(options).set({ text: opt.text }).where(eq(options.questionId, id));
    }
  }
  return { ok: true };
}

export interface ImportResult {
  ok: boolean;
  total: number;
  valid: number;
  inserted: number;
  errors: { index: number; id?: string; message: string }[];
}

/**
 * Validate + atomically import reading questions from JSON. If ANY item is invalid,
 * nothing is written (no half-batch dirty data). Duplicate ids are treated as errors.
 */
export async function importContent(json: string, commit: boolean): Promise<ImportResult> {
  await requireAdmin();
  const errors: ImportResult["errors"] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      total: 0,
      valid: 0,
      inserted: 0,
      errors: [{ index: -1, message: "JSON invalide." }],
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      total: 0,
      valid: 0,
      inserted: 0,
      errors: [{ index: -1, message: "Le JSON doit être un tableau." }],
    };
  }

  const validItems: any[] = [];
  parsed.forEach((raw: any, index) => {
    const result = readingItemSchema.safeParse(raw);
    if (!result.success) {
      errors.push({ index, id: raw?.id, message: result.error.issues[0]?.message ?? "invalide" });
    } else {
      validItems.push(result.data);
    }
  });

  // duplicate id check (within batch + against DB)
  const ids = validItems.map((v) => v.id);
  const dupInBatch = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dupInBatch))
    errors.push({ index: -1, id, message: `id dupliqué dans le lot: ${id}` });
  if (ids.length) {
    const existing = await db
      .select({ id: questions.id })
      .from(questions)
      .where(inArray(questions.id, ids));
    for (const row of existing)
      errors.push({ index: -1, id: row.id, message: `id déjà existant: ${row.id}` });
  }

  const result: ImportResult = {
    ok: errors.length === 0,
    total: parsed.length,
    valid: validItems.length,
    inserted: 0,
    errors,
  };
  if (!result.ok || !commit) return result;

  await db.transaction(async (tx) => {
    for (const r of validItems) {
      await tx.insert(questions).values({
        id: r.id,
        slug: r.slug,
        version: r.version,
        status: r.status,
        skill: "reading",
        subtype: r.subtype,
        topic: r.topic,
        cefrLevel: r.cefrLevel,
        targetNclc: r.targetNclc,
        stem: r.stem,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        distractorRationales: r.distractorRationales,
        stimulus: { kind: "text", title: r.passage.title, text: r.passage.text },
        vocabulary: r.vocabulary,
        estimatedSeconds: r.estimatedSeconds,
        difficultyEvidence: r.difficultyEvidence,
        qualityScore: r.qualityScore,
        author: r.author,
        reviewer: r.reviewer,
        sourceType: r.sourceType,
        publishedAt: new Date(),
      });
      await tx.insert(options).values(
        r.options.map((o: any, i: number) => ({
          questionId: r.id,
          optionId: o.id,
          text: o.text,
          orderIndex: i,
        })),
      );
    }
  });
  result.inserted = validItems.length;
  return result;
}

export async function resolveReport(
  id: string,
  status: "reviewing" | "resolved" | "dismissed",
  note?: string,
): Promise<{ ok: true }> {
  await requireAdmin();
  await db
    .update(issueReports)
    .set({ status, adminNote: note ?? null, resolvedAt: status === "resolved" ? new Date() : null })
    .where(eq(issueReports.id, id));
  return { ok: true };
}
