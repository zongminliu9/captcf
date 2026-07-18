import "server-only";
import { db } from "@/db";
import {
  attempts,
  mockItems,
  mockSections,
  mockTests,
  practiceSessions,
  responses,
  speakingFeedback,
  speakingSubmissions,
  speakingTasks,
  writingFeedback,
  writingSubmissions,
  writingTasks,
} from "@/db/schema";
import { type Actor, ownerEq, ownerValues } from "@/lib/auth/owner";
import { EXAM_SPEC, type SkillId } from "@/lib/exam/config";
import { scoreToCefr, scoreToNclc } from "@/lib/exam/nclc";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type ClientQuestion, getClientQuestions } from "./questions";
import { submitSession } from "./session";

type SectionKind = "qcm" | "writing" | "speaking";

interface MockSectionConfig {
  skill: SkillId;
  kind: SectionKind;
  refType: string;
  durationSeconds: number;
  refIds: string[];
  startedAt: string | null; // ISO
}
interface MockConfig {
  mockTestId: string;
  sections: MockSectionConfig[];
  currentSectionIndex: number;
}

const KIND: Record<SkillId, SectionKind> = {
  listening: "qcm",
  reading: "qcm",
  writing: "writing",
  speaking: "speaking",
};

export async function createMockSession(actor: Actor, mockTestId: string): Promise<string> {
  const existing = await db
    .select({ id: practiceSessions.id })
    .from(practiceSessions)
    .where(
      and(
        ownerEq(practiceSessions, actor),
        eq(practiceSessions.mockTestId, mockTestId),
        eq(practiceSessions.mode, "mock"),
        eq(practiceSessions.status, "in_progress"),
      ),
    )
    .orderBy(desc(practiceSessions.createdAt))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const sections = await db
    .select()
    .from(mockSections)
    .where(eq(mockSections.mockTestId, mockTestId))
    .orderBy(asc(mockSections.orderIndex));

  const cfgSections: MockSectionConfig[] = [];
  const itemOrder: { refType: string; refId: string }[] = [];
  for (const sec of sections) {
    const items = await db
      .select({ refId: mockItems.refId, refType: mockItems.refType })
      .from(mockItems)
      .where(eq(mockItems.mockSectionId, sec.id))
      .orderBy(asc(mockItems.orderIndex));
    const refIds = items.map((i) => i.refId);
    cfgSections.push({
      skill: sec.skill,
      kind: KIND[sec.skill],
      refType: items[0]?.refType ?? "question",
      durationSeconds: sec.durationSeconds,
      refIds,
      startedAt: null,
    });
    for (const it of items) itemOrder.push({ refType: it.refType, refId: it.refId });
  }

  const config: MockConfig = { mockTestId, sections: cfgSections, currentSectionIndex: 0 };
  const [row] = await db
    .insert(practiceSessions)
    .values({
      ...ownerValues(actor),
      mode: "mock",
      status: "created",
      timed: true,
      instantFeedback: false,
      config,
      itemOrder,
      mockTestId,
      durationSeconds: cfgSections.reduce((s, x) => s + x.durationSeconds, 0),
    })
    .returning({ id: practiceSessions.id });
  return row!.id;
}

export interface MockWritingTask {
  id: string;
  promptFr: string;
  contextFr: string;
  minWords: number;
  maxWords: number;
  draft: string;
}
export interface MockSpeakingTask {
  id: string;
  promptFr: string;
  contextFr: string;
  guidingPointsFr: string[];
  prepSeconds: number;
  speakSeconds: number;
  submitted: boolean;
}

export interface MockState {
  sessionId: string;
  status: "in_progress" | "graded";
  attemptId?: string;
  mockTitle: string;
  sectionIndex: number;
  totalSections: number;
  sectionLabels: string[];
  section?: {
    skill: SkillId;
    kind: SectionKind;
    label: string;
    durationSeconds: number;
    remainingSeconds: number;
    started: boolean;
    questions?: ClientQuestion[];
    answered?: { refId: string; selectedAnswer: string | null }[];
    writingTasks?: MockWritingTask[];
    speakingTasks?: MockSpeakingTask[];
  };
}

function remaining(sec: MockSectionConfig, now: Date): number {
  if (!sec.startedAt) return sec.durationSeconds;
  const elapsed = (now.getTime() - new Date(sec.startedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(sec.durationSeconds - elapsed));
}

export async function getMockState(actor: Actor, sessionId: string): Promise<MockState | null> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.id, sessionId), ownerEq(practiceSessions, actor)))
    .limit(1);
  const session = rows[0];
  if (!session || session.mode !== "mock") return null;

  const [mock] = await db
    .select({ title: mockTests.title })
    .from(mockTests)
    .where(eq(mockTests.id, session.mockTestId!))
    .limit(1);
  const config = session.config as MockConfig;
  const labels = config.sections.map((s) => EXAM_SPEC[s.skill].labelFr);

  if (["graded", "submitted", "reviewed", "expired"].includes(session.status)) {
    const att = await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId))
      .limit(1);
    return {
      sessionId,
      status: "graded",
      attemptId: att[0]?.id,
      mockTitle: mock?.title ?? "Examen blanc",
      sectionIndex: config.sections.length,
      totalSections: config.sections.length,
      sectionLabels: labels,
    };
  }

  const now = new Date();
  let idx = config.currentSectionIndex;
  let mutated = false;
  while (idx < config.sections.length) {
    const sec = config.sections[idx]!;
    if (sec.startedAt && remaining(sec, now) <= 0) {
      idx += 1;
      mutated = true;
    } else break;
  }
  if (idx >= config.sections.length) {
    const summary = await submitMock(actor, sessionId, { expired: true });
    return {
      sessionId,
      status: "graded",
      attemptId: summary.attemptId,
      mockTitle: mock?.title ?? "Examen blanc",
      sectionIndex: config.sections.length,
      totalSections: config.sections.length,
      sectionLabels: labels,
    };
  }
  if (mutated) {
    config.currentSectionIndex = idx;
    await db.update(practiceSessions).set({ config }).where(eq(practiceSessions.id, sessionId));
  }

  const sec = config.sections[idx]!;
  const base = {
    skill: sec.skill,
    kind: sec.kind,
    label: EXAM_SPEC[sec.skill].labelFr,
    durationSeconds: sec.durationSeconds,
    remainingSeconds: remaining(sec, now),
    started: !!sec.startedAt,
  };

  let section: MockState["section"];
  if (sec.kind === "qcm") {
    const questions = await getClientQuestions(sec.refIds);
    const answeredRows = await db
      .select({ refId: responses.refId, selectedAnswer: responses.selectedAnswer })
      .from(responses)
      .where(eq(responses.sessionId, sessionId));
    const answered = answeredRows
      .filter((r) => sec.refIds.includes(r.refId))
      .map((r) => ({ refId: r.refId, selectedAnswer: r.selectedAnswer }));
    section = { ...base, questions, answered };
  } else if (sec.kind === "writing") {
    const tasks = await db
      .select()
      .from(writingTasks)
      .where(inArraySafe(writingTasks.id, sec.refIds));
    const subs = await db
      .select({ taskId: writingSubmissions.taskId, text: writingSubmissions.text })
      .from(writingSubmissions)
      .where(and(ownerEq(writingSubmissions, actor), eq(writingSubmissions.sessionId, sessionId)));
    const draftBy = new Map(subs.map((s) => [s.taskId, s.text]));
    const ordered = sec.refIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    section = {
      ...base,
      writingTasks: ordered.map((t) => ({
        id: t.id,
        promptFr: t.promptFr,
        contextFr: t.contextFr,
        minWords: t.minWords,
        maxWords: t.maxWords,
        draft: draftBy.get(t.id) ?? "",
      })),
    };
  } else {
    const tasks = await db
      .select()
      .from(speakingTasks)
      .where(inArraySafe(speakingTasks.id, sec.refIds));
    const subs = await db
      .select({ taskId: speakingSubmissions.taskId })
      .from(speakingSubmissions)
      .where(
        and(ownerEq(speakingSubmissions, actor), eq(speakingSubmissions.sessionId, sessionId)),
      );
    const done = new Set(subs.map((s) => s.taskId));
    const ordered = sec.refIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    section = {
      ...base,
      speakingTasks: ordered.map((t) => ({
        id: t.id,
        promptFr: t.promptFr,
        contextFr: t.contextFr,
        guidingPointsFr: t.guidingPointsFr,
        prepSeconds: t.prepSeconds,
        speakSeconds: t.speakSeconds,
        submitted: done.has(t.id),
      })),
    };
  }

  return {
    sessionId,
    status: "in_progress",
    mockTitle: mock?.title ?? "Examen blanc",
    sectionIndex: idx,
    totalSections: config.sections.length,
    sectionLabels: labels,
    section,
  };
}

// small helper to avoid empty IN () crashing
function inArraySafe(col: any, ids: string[]) {
  return ids.length ? inArray(col, ids) : eq(col, "__none__");
}

export async function startMockSection(actor: Actor, sessionId: string): Promise<void> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.id, sessionId), ownerEq(practiceSessions, actor)))
    .limit(1);
  const session = rows[0];
  if (!session || session.mode !== "mock") return;
  const config = session.config as MockConfig;
  const sec = config.sections[config.currentSectionIndex];
  if (sec && !sec.startedAt) {
    sec.startedAt = new Date().toISOString();
    await db
      .update(practiceSessions)
      .set({ config, status: "in_progress", startedAt: session.startedAt ?? new Date() })
      .where(eq(practiceSessions.id, sessionId));
  }
}

export async function advanceMockSection(
  actor: Actor,
  sessionId: string,
): Promise<{ done: boolean; attemptId?: string }> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.id, sessionId), ownerEq(practiceSessions, actor)))
    .limit(1);
  const session = rows[0];
  if (!session || session.mode !== "mock") return { done: false };
  const config = session.config as MockConfig;
  config.currentSectionIndex += 1;
  await db.update(practiceSessions).set({ config }).where(eq(practiceSessions.id, sessionId));
  if (config.currentSectionIndex >= config.sections.length) {
    const summary = await submitMock(actor, sessionId);
    return { done: true, attemptId: summary.attemptId };
  }
  return { done: false };
}

/**
 * Grade the whole mock into ONE attempt: reuse submitSession for CO/CE (auto-scored +
 * mastery/mistakes/review), then augment the attempt with EE/EO local-rubric bands.
 * Idempotent.
 */
export async function submitMock(
  actor: Actor,
  sessionId: string,
  opts: { expired?: boolean } = {},
): Promise<{ attemptId: string }> {
  const summary = await submitSession(actor, sessionId, opts);

  // EE bands from writing feedback for this session
  const wRows = await db
    .select({ band: writingFeedback.rubric, taskId: writingSubmissions.taskId })
    .from(writingSubmissions)
    .leftJoin(writingFeedback, eq(writingFeedback.submissionId, writingSubmissions.id))
    .where(and(ownerEq(writingSubmissions, actor), eq(writingSubmissions.sessionId, sessionId)));
  const wBands = wRows
    .map((r) => (r.band as any)?.estimatedBand)
    .filter((b): b is number => typeof b === "number");

  // EO bands from speaking feedback for this session
  const sRows = await db
    .select({ band: speakingFeedback.rubric })
    .from(speakingSubmissions)
    .leftJoin(speakingFeedback, eq(speakingFeedback.submissionId, speakingSubmissions.id))
    .where(and(ownerEq(speakingSubmissions, actor), eq(speakingSubmissions.sessionId, sessionId)));
  const sBands = sRows
    .map((r) => (r.band as any)?.estimatedBand)
    .filter((b): b is number => typeof b === "number");

  const attRows = await db
    .select()
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId))
    .limit(1);
  const att = attRows[0];
  if (att) {
    const per = { ...(att.perSkill as Record<string, unknown>) };
    if (wBands.length) {
      const band = Math.round(wBands.reduce((a, b) => a + b, 0) / wBands.length);
      per.writing = productiveEntry("writing", band, wBands.length);
    }
    if (sBands.length) {
      const band = Math.round(sBands.reduce((a, b) => a + b, 0) / sBands.length);
      per.speaking = productiveEntry("speaking", band, sBands.length);
    }
    await db.update(attempts).set({ perSkill: per, estimate: per }).where(eq(attempts.id, att.id));
  }
  return { attemptId: summary.attemptId };
}

function productiveEntry(skill: "writing" | "speaking", band: number, tasks: number) {
  return {
    kind: "productive" as const,
    tasks,
    band,
    cefr: scoreToCefr(skill, band),
    nclc: scoreToNclc(skill, band),
    source: "local" as const,
  };
}
