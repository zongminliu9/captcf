import "server-only";
import { db } from "@/db";
import { attempts, examGoals, masteryRecords, questions, reviewQueue } from "@/db/schema";
import { type Actor, ownerEq } from "@/lib/auth/owner";
import { SKILLS, type SkillId } from "@/lib/exam/config";
import { INITIAL_MASTERY, type MasteryState } from "@/lib/mastery";
import { type Recommendation, type SkillSnapshot, recommend } from "@/lib/recommend";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface DashboardData {
  goal: {
    targetNclc: number;
    examDate: string | null;
    dailyMinutes: number;
    weeklyDays: number;
  } | null;
  snapshots: SkillSnapshot[];
  recommendations: Recommendation[];
  dueReviewCount: number;
  streakDays: number;
  weeklyMinutes: number;
  recentAttempts: (typeof attempts.$inferSelect)[];
  totalAnswered: number;
  hasData: boolean;
}

/** Rough NCLC estimate from a skill's mastery (only meaningful once practised). */
function masteryToNclc(state: MasteryState): number {
  if (state.attempts === 0) return 0;
  return Math.round(3 + state.mastery * 7); // 0.0→3 … 1.0→10
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export async function getDashboardData(actor: Actor): Promise<DashboardData> {
  const now = new Date();

  const [goalRow] = await db.select().from(examGoals).where(ownerEq(examGoals, actor)).limit(1);
  const goal = goalRow
    ? {
        targetNclc: goalRow.targetNclc,
        examDate: goalRow.examDate,
        dailyMinutes: goalRow.dailyMinutes,
        weeklyDays: goalRow.weeklyDays,
      }
    : null;

  const masteryRows = await db
    .select()
    .from(masteryRecords)
    .where(and(ownerEq(masteryRecords, actor), eq(masteryRecords.subtype, "_all")));
  const masteryBySkill = new Map<string, MasteryState>();
  for (const m of masteryRows) masteryBySkill.set(m.skill, m.state as MasteryState);

  // due reviews grouped by skill (+ overall + max overdue)
  const dueRows = await db
    .select({
      skill: questions.skill,
      n: sql<number>`count(*)::int`,
      oldest: sql<Date>`min(${reviewQueue.dueAt})`,
    })
    .from(reviewQueue)
    .innerJoin(questions, eq(questions.id, reviewQueue.questionId))
    .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, now)))
    .groupBy(questions.skill);
  const dueBySkill = new Map(dueRows.map((r) => [r.skill, r]));
  const dueReviewCount = dueRows.reduce((s, r) => s + r.n, 0);

  const targetNclc = goal?.targetNclc ?? 7;
  const snapshots: SkillSnapshot[] = SKILLS.map((skill: SkillId) => {
    const state = masteryBySkill.get(skill) ?? INITIAL_MASTERY;
    const due = dueBySkill.get(skill);
    const overdueDays = due?.oldest ? Math.max(0, daysBetween(new Date(due.oldest), now)) : 0;
    return {
      skill,
      mastery: state.mastery,
      confidence: state.confidence,
      attempts: state.attempts,
      targetNclc,
      estimatedNclc: masteryToNclc(state),
      dueReviewCount: due?.n ?? 0,
      overdueDays,
      lastPracticedAt: state.lastPracticedAt ? new Date(state.lastPracticedAt) : null,
      trend: state.trend,
      slowPace: false,
    };
  });

  const recentAttempts = await db
    .select()
    .from(attempts)
    .where(ownerEq(attempts, actor))
    .orderBy(desc(attempts.submittedAt))
    .limit(8);

  // streak: consecutive days (ending today or yesterday) with an attempt
  const dayRows = await db
    .select({ day: sql<string>`to_char(${attempts.submittedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')` })
    .from(attempts)
    .where(ownerEq(attempts, actor))
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);
  const days = new Set(dayRows.map((r) => r.day));
  let streakDays = 0;
  const cursor = new Date(now);
  // allow the streak to count if today has none but yesterday does
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [weekly] = await db
    .select({ secs: sql<number>`coalesce(sum(${attempts.durationSeconds}),0)::int` })
    .from(attempts)
    .where(and(ownerEq(attempts, actor), gte(attempts.submittedAt, weekAgo)));
  const weeklyMinutes = Math.round((weekly?.secs ?? 0) / 60);

  const totalAnswered = masteryRows.reduce((s, m) => s + (m.state as MasteryState).attempts, 0);

  const recommendations = recommend({
    now,
    examDate: goal?.examDate ? new Date(goal.examDate) : null,
    dailyMinutes: goal?.dailyMinutes ?? 20,
    skills: snapshots,
  });

  return {
    goal,
    snapshots,
    recommendations,
    dueReviewCount,
    streakDays,
    weeklyMinutes,
    recentAttempts,
    totalAnswered,
    hasData: totalAnswered > 0 || recentAttempts.length > 0,
  };
}
