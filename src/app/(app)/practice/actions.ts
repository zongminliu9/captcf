"use server";
import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { checkPracticeAllowed } from "@/lib/entitlements/usage";
import type { SkillId } from "@/lib/exam/config";
import {
  type RecordResult,
  createSession,
  recordResponse,
  submitSession,
} from "@/lib/practice/session";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

/** Resume an in-progress session of a mode, or create a new one. Prevents dupes on refresh. */
async function resumeOrCreate(
  actorPromise: ReturnType<typeof ensureActor>,
  mode: "quick" | "listening" | "reading" | "diagnostic",
  create: () => Promise<string>,
): Promise<string> {
  const actor = await actorPromise;
  const existing = await db
    .select({ id: practiceSessions.id })
    .from(practiceSessions)
    .where(
      and(
        ownerEq(practiceSessions, actor),
        eq(practiceSessions.mode, mode),
        eq(practiceSessions.status, "in_progress"),
      ),
    )
    .orderBy(desc(practiceSessions.createdAt))
    .limit(1);
  if (existing[0]) return existing[0].id;
  return create();
}

export async function startQuickPractice(): Promise<never> {
  const actor = await ensureActor();
  const plan = await getPlanForActor(actor);
  const blocked = await checkPracticeAllowed(actor, plan);
  if (blocked) redirect("/pricing?reason=daily_limit");

  const id = await resumeOrCreate(Promise.resolve(actor), "quick", () =>
    createSession(actor, {
      mode: "quick",
      config: { label: "Séance rapide" },
      instantFeedback: true,
      timed: false,
      selection: { skills: ["listening", "reading"], count: 8, source: "mixed" },
    }),
  );
  redirect(`/practice/session/${id}`);
}

export interface CustomConfig {
  skills: SkillId[];
  count: number;
  cefrLevels?: string[];
  subtypes?: string[];
  topics?: string[];
  source?: "mixed" | "new" | "mistakes" | "bookmarks" | "due";
  timed?: boolean;
  instantFeedback?: boolean;
}

export async function startCustomPractice(cfg: CustomConfig): Promise<never> {
  const actor = await ensureActor();
  const plan = await getPlanForActor(actor);
  const blocked = await checkPracticeAllowed(actor, plan);
  if (blocked) redirect("/pricing?reason=daily_limit");

  let id: string;
  try {
    id = await createSession(actor, {
      mode: "custom",
      config: cfg as unknown as Record<string, unknown>,
      instantFeedback: cfg.instantFeedback ?? !cfg.timed,
      timed: cfg.timed ?? false,
      durationSeconds: cfg.timed ? cfg.count * 60 : null,
      selection: {
        skills: cfg.skills.length ? cfg.skills : ["listening", "reading"],
        count: Math.min(60, Math.max(1, cfg.count)),
        cefrLevels: cfg.cefrLevels,
        subtypes: cfg.subtypes,
        topics: cfg.topics,
        source: cfg.source ?? "mixed",
      },
    });
  } catch {
    redirect("/practice/custom?empty=1");
  }
  redirect(`/practice/session/${id}`);
}

export async function startSkillPractice(skill: SkillId): Promise<never> {
  const actor = await ensureActor();
  const plan = await getPlanForActor(actor);
  const blocked = await checkPracticeAllowed(actor, plan);
  if (blocked) redirect("/pricing?reason=daily_limit");
  const mode = skill === "listening" ? "listening" : "reading";
  const id = await resumeOrCreate(Promise.resolve(actor), mode, () =>
    createSession(actor, {
      mode,
      skill,
      instantFeedback: true,
      selection: { skills: [skill], count: 10, source: "mixed" },
    }),
  );
  redirect(`/practice/session/${id}`);
}

export async function saveAnswer(
  sessionId: string,
  input: { refId: string; selectedAnswer: string | null; responseMs?: number; hintUsed?: boolean },
): Promise<RecordResult> {
  const actor = await ensureActor();
  return recordResponse(actor, sessionId, input);
}

export async function submitPractice(sessionId: string): Promise<never> {
  const actor = await ensureActor();
  const summary = await submitSession(actor, sessionId);
  redirect(`/attempts/${summary.attemptId}/results`);
}
