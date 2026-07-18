import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  masteryRecords,
  mistakes,
  practiceSessions,
  questions,
  responses,
  reviewQueue,
} from "@/db/schema";
import { type Actor, ownerEq, ownerValues } from "@/lib/auth/owner";
import type { CefrLevel, SkillId } from "@/lib/exam/config";
import { estimateQcmScore, type QcmResponseLite } from "@/lib/exam/scoring";
import { INITIAL_MASTERY, type MasteryState, updateMastery } from "@/lib/mastery";
import { INITIAL_SM2, qualityFromResponse, review, type Sm2State } from "@/lib/review/sm2";
import { isExpired } from "@/lib/exam/timer";
import { selectQuestionIds, type SelectionConfig } from "./questions";

export type SessionMode =
  | "quick"
  | "custom"
  | "diagnostic"
  | "review"
  | "mistakes"
  | "bookmarks"
  | "listening"
  | "reading"
  | "mock";

export interface CreateSessionInput {
  mode: SessionMode;
  skill?: SkillId | null;
  config?: Record<string, unknown>;
  itemRefs?: { refType: string; refId: string }[];
  selection?: SelectionConfig;
  timed?: boolean;
  instantFeedback?: boolean;
  durationSeconds?: number | null;
  mockTestId?: string | null;
}

export async function createSession(actor: Actor, input: CreateSessionInput): Promise<string> {
  let itemOrder = input.itemRefs;
  if (!itemOrder && input.selection) {
    const ids = await selectQuestionIds(actor, input.selection);
    itemOrder = ids.map((refId) => ({ refType: "question", refId }));
  }
  if (!itemOrder || itemOrder.length === 0) {
    throw new Error("Cannot create a session with no items");
  }

  const [row] = await db
    .insert(practiceSessions)
    .values({
      ...ownerValues(actor),
      mode: input.mode,
      skill: input.skill ?? null,
      status: "created",
      config: input.config ?? {},
      itemOrder,
      timed: input.timed ?? false,
      instantFeedback: input.instantFeedback ?? input.mode !== "mock",
      durationSeconds: input.durationSeconds ?? null,
      mockTestId: input.mockTestId ?? null,
    })
    .returning({ id: practiceSessions.id });
  return row!.id;
}

export type SessionRow = typeof practiceSessions.$inferSelect;

export async function loadSession(actor: Actor, id: string): Promise<SessionRow | null> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.id, id), ownerEq(practiceSessions, actor)))
    .limit(1);
  const session = rows[0];
  if (!session) return null;

  // auto-expire a timed session whose deadline has passed → auto-submit
  if (
    session.timed &&
    session.durationSeconds &&
    session.startedAt &&
    (session.status === "in_progress" || session.status === "paused") &&
    isExpired({ startedAt: session.startedAt, durationSeconds: session.durationSeconds })
  ) {
    await submitSession(actor, id, { expired: true });
    const refreshed = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, id))
      .limit(1);
    return refreshed[0] ?? session;
  }
  return session;
}

/** Begin the clock/state the first time a learner interacts. */
async function ensureStarted(session: SessionRow): Promise<void> {
  if (session.status === "created") {
    await db
      .update(practiceSessions)
      .set({ status: "in_progress", startedAt: session.startedAt ?? new Date() })
      .where(eq(practiceSessions.id, session.id));
  }
}

export interface RecordInput {
  refId: string;
  selectedAnswer: string | null;
  responseMs?: number;
  hintUsed?: boolean;
  flagged?: boolean;
}

export interface RecordResult {
  saved: true;
  feedback?: {
    correct: boolean;
    correctAnswer: string;
    explanation: string;
    distractorRationales: Record<string, string>;
    transcript: string | null;
  };
}

/** Persist a single answer. Correctness is computed server-side (never trusted from client). */
export async function recordResponse(
  actor: Actor,
  sessionId: string,
  input: RecordInput,
): Promise<RecordResult> {
  const session = await loadSession(actor, sessionId);
  if (!session) throw new Error("Session not found");
  if (["submitted", "graded", "reviewed", "expired"].includes(session.status)) {
    throw new Error("Session already submitted");
  }
  if (!session.itemOrder.some((it) => it.refId === input.refId)) {
    throw new Error("Item not part of this session");
  }
  await ensureStarted(session);

  const qRows = await db
    .select({
      skill: questions.skill,
      cefr: questions.cefrLevel,
      correct: questions.correctAnswer,
      explanation: questions.explanation,
      rationales: questions.distractorRationales,
      stimulus: questions.stimulus,
    })
    .from(questions)
    .where(eq(questions.id, input.refId))
    .limit(1);
  const q = qRows[0];
  if (!q) throw new Error("Question not found");

  const correct = input.selectedAnswer != null ? input.selectedAnswer === q.correct : null;

  await db
    .insert(responses)
    .values({
      sessionId,
      ...ownerValues(actor),
      refType: "question",
      refId: input.refId,
      skill: q.skill,
      cefrLevel: q.cefr,
      selectedAnswer: input.selectedAnswer,
      correct,
      responseMs: input.responseMs ?? null,
      hintUsed: input.hintUsed ?? false,
      flagged: input.flagged ?? false,
      answeredAt: input.selectedAnswer != null ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [responses.sessionId, responses.refId],
      set: {
        selectedAnswer: input.selectedAnswer,
        correct,
        responseMs: input.responseMs ?? null,
        hintUsed: input.hintUsed ?? false,
        flagged: input.flagged ?? false,
        answeredAt: input.selectedAnswer != null ? new Date() : null,
      },
    });

  if (session.instantFeedback && input.selectedAnswer != null) {
    const stim = q.stimulus as any;
    return {
      saved: true,
      feedback: {
        correct: correct ?? false,
        correctAnswer: q.correct,
        explanation: q.explanation,
        distractorRationales: q.rationales as Record<string, string>,
        transcript: q.skill === "listening" ? (stim?.transcript ?? null) : null,
      },
    };
  }
  return { saved: true };
}

export async function toggleFlag(actor: Actor, sessionId: string, refId: string, flagged: boolean) {
  await db
    .insert(responses)
    .values({
      sessionId,
      ...ownerValues(actor),
      refType: "question",
      refId,
      skill: "reading",
      cefrLevel: "B1",
      selectedAnswer: null,
      correct: null,
      flagged,
    })
    .onConflictDoUpdate({ target: [responses.sessionId, responses.refId], set: { flagged } });
}

export interface AttemptSummary {
  attemptId: string;
  totalItems: number;
  answered: number;
  correctItems: number;
  perSkill: Record<string, { answered: number; correct: number; estimate: ReturnType<typeof estimateQcmScore> }>;
}

/**
 * Grade a session: score server-side, write an immutable attempt, and update mastery,
 * mistakes and the spaced-repetition queue. Idempotent — re-submitting returns the
 * existing attempt without double-counting.
 */
export async function submitSession(
  actor: Actor,
  sessionId: string,
  opts: { expired?: boolean } = {},
): Promise<AttemptSummary> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.id, sessionId), ownerEq(practiceSessions, actor)))
    .limit(1);
  const session = rows[0];
  if (!session) throw new Error("Session not found");

  const existing = await db
    .select()
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId))
    .limit(1);
  if (existing[0]) return summaryFromAttempt(existing[0]);

  const resp = await db.select().from(responses).where(eq(responses.sessionId, sessionId));
  const answered = resp.filter((r) => r.selectedAnswer != null);

  // per-skill aggregation
  const perSkill: AttemptSummary["perSkill"] = {};
  const bySkill = new Map<string, QcmResponseLite[]>();
  for (const r of answered) {
    const arr = bySkill.get(r.skill) ?? [];
    arr.push({ cefr: r.cefrLevel as CefrLevel, correct: !!r.correct });
    bySkill.set(r.skill, arr);
  }
  for (const [skill, lites] of bySkill) {
    perSkill[skill] = {
      answered: lites.length,
      correct: lites.filter((l) => l.correct).length,
      estimate: estimateQcmScore(skill as SkillId, lites),
    };
  }

  const totalItems = session.itemOrder.length;
  const correctItems = answered.filter((r) => r.correct).length;
  const durationSeconds =
    session.startedAt != null ? Math.round((Date.now() - session.startedAt.getTime()) / 1000) : null;

  const [attempt] = await db
    .insert(attempts)
    .values({
      sessionId,
      ...ownerValues(actor),
      mode: session.mode,
      skill: session.skill,
      mockTestId: session.mockTestId,
      totalItems,
      correctItems,
      perSkill,
      estimate: perSkill,
      durationSeconds,
    })
    .returning();

  await db
    .update(practiceSessions)
    .set({ status: opts.expired ? "expired" : "graded", submittedAt: new Date(), gradedAt: new Date() })
    .where(eq(practiceSessions.id, sessionId));

  await applyLearningUpdates(actor, answered);

  return summaryFromAttempt(attempt!);
}

function summaryFromAttempt(a: typeof attempts.$inferSelect): AttemptSummary {
  const per = a.perSkill as AttemptSummary["perSkill"];
  const answered = Object.values(per).reduce((s, v) => s + v.answered, 0);
  return {
    attemptId: a.id,
    totalItems: a.totalItems,
    answered,
    correctItems: a.correctItems,
    perSkill: per,
  };
}

/** Update mastery, mistakes and the review queue from a session's answers. */
async function applyLearningUpdates(
  actor: Actor,
  answered: (typeof responses.$inferSelect)[],
): Promise<void> {
  if (answered.length === 0) return;

  // ── mastery per (skill, subtype) and (skill, _all) ──
  const subtypeRows = await db
    .select({ id: questions.id, subtype: questions.subtype })
    .from(questions)
    .where(inArray(questions.id, answered.map((r) => r.refId)));
  const subtypeOf = new Map(subtypeRows.map((r) => [r.id, r.subtype]));

  const masteryKeys = new Set<string>();
  for (const r of answered) {
    masteryKeys.add(`${r.skill}::_all`);
    const st = subtypeOf.get(r.refId);
    if (st) masteryKeys.add(`${r.skill}::${st}`);
  }
  const existingMastery = await db.select().from(masteryRecords).where(ownerEq(masteryRecords, actor));
  const stateMap = new Map<string, MasteryState>();
  for (const m of existingMastery) stateMap.set(`${m.skill}::${m.subtype}`, m.state as MasteryState);

  for (const r of answered) {
    const keys = [`${r.skill}::_all`];
    const st = subtypeOf.get(r.refId);
    if (st) keys.push(`${r.skill}::${st}`);
    for (const key of keys) {
      const prev = stateMap.get(key) ?? INITIAL_MASTERY;
      const next = updateMastery(prev, {
        correct: !!r.correct,
        cefr: r.cefrLevel as CefrLevel,
        responseMs: r.responseMs ?? undefined,
        at: r.answeredAt ?? new Date(),
      });
      stateMap.set(key, next);
    }
  }
  for (const [key, state] of stateMap) {
    const [skill, subtype] = key.split("::") as [SkillId, string];
    await db
      .insert(masteryRecords)
      .values({ ...ownerValues(actor), skill, subtype, state })
      .onConflictDoUpdate({
        target: actor.kind === "user"
          ? [masteryRecords.userId, masteryRecords.skill, masteryRecords.subtype]
          : [masteryRecords.guestId, masteryRecords.skill, masteryRecords.subtype],
        set: { state, updatedAt: new Date() },
      });
  }

  // ── mistakes + review queue (SM-2) ──
  const now = new Date();
  const reviewRows = await db.select().from(reviewQueue).where(ownerEq(reviewQueue, actor));
  const reviewMap = new Map(reviewRows.map((r) => [r.questionId, r]));

  for (const r of answered) {
    if (r.correct === false) {
      // mistake upsert
      await db
        .insert(mistakes)
        .values({ ...ownerValues(actor), questionId: r.refId, wrongCount: 1, resolved: false, lastWrongAt: now })
        .onConflictDoUpdate({
          target: actor.kind === "user" ? [mistakes.userId, mistakes.questionId] : [mistakes.guestId, mistakes.questionId],
          set: { wrongCount: sql`${mistakes.wrongCount} + 1`, resolved: false, lastWrongAt: now },
        });
      // add / advance in review queue
      const quality = qualityFromResponse({ correct: false, hintUsed: r.hintUsed });
      const prev = (reviewMap.get(r.refId)?.sm2 as Sm2State) ?? INITIAL_SM2;
      const next = review(prev, quality, now);
      await db
        .insert(reviewQueue)
        .values({ ...ownerValues(actor), questionId: r.refId, sm2: next, dueAt: next.dueAt, source: "mistake", lastReviewedAt: now })
        .onConflictDoUpdate({
          target: actor.kind === "user" ? [reviewQueue.userId, reviewQueue.questionId] : [reviewQueue.guestId, reviewQueue.questionId],
          set: { sm2: next, dueAt: next.dueAt, lastReviewedAt: now },
        });
    } else if (r.correct === true) {
      // resolve a prior mistake
      await db
        .update(mistakes)
        .set({ resolved: true })
        .where(and(ownerEq(mistakes, actor), eq(mistakes.questionId, r.refId)));
      // advance an existing review item
      const existing = reviewMap.get(r.refId);
      if (existing) {
        const quality = qualityFromResponse({ correct: true, responseMs: r.responseMs ?? undefined });
        const next = review(existing.sm2 as Sm2State, quality, now);
        await db
          .update(reviewQueue)
          .set({ sm2: next, dueAt: next.dueAt, lastReviewedAt: now })
          .where(and(ownerEq(reviewQueue, actor), eq(reviewQueue.questionId, r.refId)));
      }
    }
  }
}

/** Recent attempts for the actor (dashboard/progress). */
export async function recentAttempts(actor: Actor, limit = 10) {
  return db
    .select()
    .from(attempts)
    .where(ownerEq(attempts, actor))
    .orderBy(desc(attempts.submittedAt))
    .limit(limit);
}
