import "server-only";
import { db } from "@/db";
import {
  attempts,
  mockItems,
  mockSections,
  mockTests,
  practiceSessions,
  responses,
} from "@/db/schema";
import { type Actor, ownerEq, ownerValues } from "@/lib/auth/owner";
import { EXAM_SPEC, type SkillId } from "@/lib/exam/config";
import { and, asc, desc, eq } from "drizzle-orm";
import { type ClientQuestion, getClientQuestions } from "./questions";
import { submitSession } from "./session";

interface MockSectionConfig {
  skill: SkillId;
  durationSeconds: number;
  refIds: string[];
  startedAt: string | null; // ISO
}
interface MockConfig {
  mockTestId: string;
  sections: MockSectionConfig[];
  currentSectionIndex: number;
}

/** Auto-scored sections presented in the timed runner (productive sections use their tools). */
const RUNNER_SKILLS: SkillId[] = ["listening", "reading"];

export async function createMockSession(actor: Actor, mockTestId: string): Promise<string> {
  // resume an in-progress mock for this form
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
    if (!RUNNER_SKILLS.includes(sec.skill)) continue;
    const items = await db
      .select({ refId: mockItems.refId })
      .from(mockItems)
      .where(eq(mockItems.mockSectionId, sec.id))
      .orderBy(asc(mockItems.orderIndex));
    const refIds = items.map((i) => i.refId);
    cfgSections.push({
      skill: sec.skill,
      durationSeconds: sec.durationSeconds,
      refIds,
      startedAt: null,
    });
    for (const refId of refIds) itemOrder.push({ refType: "question", refId });
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

export interface MockState {
  sessionId: string;
  status: "in_progress" | "graded";
  attemptId?: string;
  mockTitle: string;
  sectionIndex: number;
  totalSections: number;
  section?: {
    skill: SkillId;
    label: string;
    durationSeconds: number;
    remainingSeconds: number;
    started: boolean;
    questions: ClientQuestion[];
    answered: { refId: string; selectedAnswer: string | null }[];
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
      sectionIndex: 0,
      totalSections: (session.config as MockConfig).sections.length,
    };
  }

  const config = session.config as MockConfig;
  const now = new Date();

  // advance past any expired started section(s); submit when all done
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
    // all timed sections consumed → grade
    const summary = await submitSession(actor, sessionId, { expired: true });
    return {
      sessionId,
      status: "graded",
      attemptId: summary.attemptId,
      mockTitle: mock?.title ?? "Examen blanc",
      sectionIndex: idx,
      totalSections: config.sections.length,
    };
  }
  if (mutated) {
    config.currentSectionIndex = idx;
    await db.update(practiceSessions).set({ config }).where(eq(practiceSessions.id, sessionId));
  }

  const sec = config.sections[idx]!;
  const questions = await getClientQuestions(sec.refIds);
  const answeredRows = await db
    .select({ refId: responses.refId, selectedAnswer: responses.selectedAnswer })
    .from(responses)
    .where(eq(responses.sessionId, sessionId));
  const answered = answeredRows
    .filter((r) => sec.refIds.includes(r.refId))
    .map((r) => ({ refId: r.refId, selectedAnswer: r.selectedAnswer }));

  return {
    sessionId,
    status: "in_progress",
    mockTitle: mock?.title ?? "Examen blanc",
    sectionIndex: idx,
    totalSections: config.sections.length,
    section: {
      skill: sec.skill,
      label: EXAM_SPEC[sec.skill].labelFr,
      durationSeconds: sec.durationSeconds,
      remainingSeconds: remaining(sec, now),
      started: !!sec.startedAt,
      questions,
      answered,
    },
  };
}

/** Start the clock for the current section (server-authoritative). */
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

/** Advance to the next section (or grade if it was the last). */
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
  if (config.currentSectionIndex >= config.sections.length) {
    await db.update(practiceSessions).set({ config }).where(eq(practiceSessions.id, sessionId));
    const summary = await submitSession(actor, sessionId);
    return { done: true, attemptId: summary.attemptId };
  }
  await db.update(practiceSessions).set({ config }).where(eq(practiceSessions.id, sessionId));
  return { done: false };
}
