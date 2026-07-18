import "server-only";
import { and, eq, inArray, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { audioAssets, bookmarks, mistakes, options, questions, responses, reviewQueue } from "@/db/schema";
import type { Actor } from "@/lib/auth/owner";
import { ownerEq } from "@/lib/auth/owner";
import type { SkillId } from "@/lib/exam/config";

export interface ClientOption {
  id: string;
  text: string;
}

export type Stimulus =
  | { kind: "audio"; context: string; audioFile: string | null; audioDuration: number | null }
  | { kind: "text"; title: string | null; text: string };

/** Question shape sent to the client while a session is in progress (no answer key). */
export interface ClientQuestion {
  refType: "question";
  refId: string;
  skill: SkillId;
  subtype: string;
  cefrLevel: string;
  topic: string;
  targetNclc: number;
  estimatedSeconds: number;
  stem: string;
  options: ClientOption[];
  stimulus: Stimulus;
}

/** Full question incl. answer key — only used server-side or after grading. */
export interface FullQuestion extends ClientQuestion {
  correctAnswer: string;
  explanation: string;
  distractorRationales: Record<string, string>;
  vocabulary: { term: string; gloss_en: string; gloss_zh?: string }[];
  transcript: string | null;
  difficultyEvidence: string;
}

type QRow = typeof questions.$inferSelect;

function toStimulus(row: QRow, audioFile: string | null, audioDuration: number | null): Stimulus {
  const s = row.stimulus as any;
  if (row.skill === "listening") {
    return { kind: "audio", context: s?.context ?? "", audioFile, audioDuration };
  }
  return { kind: "text", title: s?.title ?? null, text: s?.text ?? "" };
}

async function optionsFor(ids: string[]): Promise<Map<string, ClientOption[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(options)
    .where(inArray(options.questionId, ids))
    .orderBy(options.questionId, options.orderIndex);
  const map = new Map<string, ClientOption[]>();
  for (const r of rows) {
    const arr = map.get(r.questionId) ?? [];
    arr.push({ id: r.optionId, text: r.text });
    map.set(r.questionId, arr);
  }
  return map;
}

async function fetchRows(ids: string[]): Promise<Map<string, { q: QRow; file: string | null; dur: number | null }>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ q: questions, file: audioAssets.file, dur: audioAssets.durationSeconds })
    .from(questions)
    .leftJoin(audioAssets, eq(audioAssets.id, questions.audioId))
    .where(inArray(questions.id, ids));
  const map = new Map<string, { q: QRow; file: string | null; dur: number | null }>();
  for (const r of rows) map.set(r.q.id, { q: r.q, file: r.file, dur: r.dur ? Number(r.dur) : null });
  return map;
}

function toClient(row: QRow, opts: ClientOption[], file: string | null, dur: number | null): ClientQuestion {
  return {
    refType: "question",
    refId: row.id,
    skill: row.skill,
    subtype: row.subtype,
    cefrLevel: row.cefrLevel,
    topic: row.topic,
    targetNclc: row.targetNclc,
    estimatedSeconds: row.estimatedSeconds,
    stem: row.stem,
    options: opts,
    stimulus: toStimulus(row, file, dur),
  };
}

/** Client-safe questions in the given id order. */
export async function getClientQuestions(ids: string[]): Promise<ClientQuestion[]> {
  const [rows, opts] = await Promise.all([fetchRows(ids), optionsFor(ids)]);
  return ids
    .map((id) => {
      const r = rows.get(id);
      if (!r) return null;
      return toClient(r.q, opts.get(id) ?? [], r.file, r.dur);
    })
    .filter((x): x is ClientQuestion => x !== null);
}

/** Full questions (with answer key) in id order — for grading & review. */
export async function getFullQuestions(ids: string[]): Promise<FullQuestion[]> {
  const [rows, opts] = await Promise.all([fetchRows(ids), optionsFor(ids)]);
  return ids
    .map((id) => {
      const r = rows.get(id);
      if (!r) return null;
      const base = toClient(r.q, opts.get(id) ?? [], r.file, r.dur);
      const s = r.q.stimulus as any;
      return {
        ...base,
        correctAnswer: r.q.correctAnswer,
        explanation: r.q.explanation,
        distractorRationales: r.q.distractorRationales,
        vocabulary: (r.q.vocabulary as any) ?? [],
        transcript: r.q.skill === "listening" ? (s?.transcript ?? null) : null,
        difficultyEvidence: r.q.difficultyEvidence,
      } satisfies FullQuestion;
    })
    .filter((x): x is FullQuestion => x !== null);
}

export interface SelectionConfig {
  skills: SkillId[];
  count: number;
  cefrLevels?: string[];
  subtypes?: string[];
  topics?: string[];
  source?: "mixed" | "new" | "mistakes" | "bookmarks" | "due";
}

/**
 * Pick published question ids matching a filter. `source` narrows to the actor's
 * mistakes / bookmarks / due reviews / unseen questions. Random order for variety.
 */
export async function selectQuestionIds(actor: Actor, cfg: SelectionConfig): Promise<string[]> {
  const conds = [eq(questions.status, "published"), inArray(questions.skill, cfg.skills)];
  if (cfg.cefrLevels?.length) conds.push(inArray(questions.cefrLevel, cfg.cefrLevels));
  if (cfg.subtypes?.length) conds.push(inArray(questions.subtype, cfg.subtypes));
  if (cfg.topics?.length) conds.push(inArray(questions.topic, cfg.topics));

  if (cfg.source === "new") {
    const answered = db
      .select({ id: responses.refId })
      .from(responses)
      .where(and(ownerEq(responses, actor), eq(responses.correct, true)));
    conds.push(notInArray(questions.id, answered));
  } else if (cfg.source === "mistakes") {
    const wrong = db
      .select({ id: mistakes.questionId })
      .from(mistakes)
      .where(and(ownerEq(mistakes, actor), eq(mistakes.resolved, false)));
    conds.push(inArray(questions.id, wrong));
  } else if (cfg.source === "bookmarks") {
    const marked = db
      .select({ id: bookmarks.questionId })
      .from(bookmarks)
      .where(ownerEq(bookmarks, actor));
    conds.push(inArray(questions.id, marked));
  } else if (cfg.source === "due") {
    const due = db
      .select({ id: reviewQueue.questionId })
      .from(reviewQueue)
      .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, new Date())));
    conds.push(inArray(questions.id, due));
  }

  // due reviews should surface oldest-due first; everything else is randomised
  const rows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(...conds))
    .orderBy(sql`random()`)
    .limit(cfg.count);
  return rows.map((r) => r.id);
}
