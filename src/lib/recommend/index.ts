/**
 * Transparent, explainable recommendation engine.
 *
 * No black box: each recommendation carries a machine-readable `reasonCode` and the
 * parameters the UI needs to render a specific, human sentence (via i18n). Priorities
 * are a weighted blend of goal gap, exam proximity, weakness, overdue reviews,
 * regression, confidence and recency.
 */
import type { SkillId } from "../exam/config";

export type ReasonCode =
  | "WEAK_SKILL"
  | "REVIEW_DUE"
  | "EXAM_SOON"
  | "GOAL_GAP"
  | "LOW_CONFIDENCE"
  | "PACE_TOO_SLOW"
  | "RECENT_REGRESSION"
  | "NEW_SKILL"
  | "MAINTAIN_MASTERY";

export type RecommendAction =
  | "targeted_practice"
  | "review_due"
  | "diagnostic"
  | "mock"
  | "new_skill"
  | "maintain";

export interface SkillSnapshot {
  skill: SkillId;
  mastery: number; // 0..1
  confidence: number; // 0..1
  attempts: number;
  targetNclc: number;
  estimatedNclc: number;
  dueReviewCount: number;
  overdueDays: number; // max overdue among due items
  lastPracticedAt: Date | null;
  trend: number; // recent - long-term accuracy
  slowPace: boolean; // avg response time well above budget
}

export interface RecommendContext {
  now: Date;
  examDate: Date | null;
  dailyMinutes: number;
  skills: SkillSnapshot[];
}

export interface Recommendation {
  id: string;
  skill: SkillId | null;
  reasonCode: ReasonCode;
  action: RecommendAction;
  priority: number; // 0..100
  estimatedMinutes: number;
  params: Record<string, string | number>;
  /** English debug string for logs/tests; the UI uses i18n on reasonCode+params. */
  debug: string;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

function practiceMinutes(ctx: RecommendContext): number {
  return Math.max(5, Math.min(ctx.dailyMinutes || 15, 12));
}

export function recommend(ctx: RecommendContext): Recommendation[] {
  const out: Recommendation[] = [];
  const daysToExam = ctx.examDate ? daysBetween(ctx.now, ctx.examDate) : null;
  const examSoon = daysToExam != null && daysToExam >= 0 && daysToExam <= 21;

  for (const s of ctx.skills) {
    const gap = Math.max(0, s.targetNclc - s.estimatedNclc);

    // 1) Overdue reviews are almost always the highest-value action.
    if (s.dueReviewCount > 0) {
      const priority = clamp(42 + Math.min(30, s.dueReviewCount * 3) + Math.min(15, s.overdueDays * 2), 0, 100);
      out.push({
        id: `review:${s.skill}`,
        skill: s.skill,
        reasonCode: "REVIEW_DUE",
        action: "review_due",
        priority,
        estimatedMinutes: Math.max(5, Math.min(ctx.dailyMinutes || 15, Math.ceil(s.dueReviewCount * 0.8))),
        params: { count: s.dueReviewCount, skill: s.skill, overdueDays: s.overdueDays },
        debug: `${s.dueReviewCount} ${s.skill} items due for review`,
      });
    }

    // 2) Goal gap, amplified when the exam is near.
    if (gap > 0) {
      const examBoost = examSoon ? 22 - (daysToExam ?? 21) : 0;
      const priority = clamp(35 + gap * 9 + examBoost, 0, 100);
      out.push({
        id: `gap:${s.skill}`,
        skill: s.skill,
        reasonCode: examSoon ? "EXAM_SOON" : "GOAL_GAP",
        action: "targeted_practice",
        priority,
        estimatedMinutes: practiceMinutes(ctx),
        params: {
          skill: s.skill,
          gap,
          targetNclc: s.targetNclc,
          estimatedNclc: s.estimatedNclc,
          daysToExam: daysToExam ?? -1,
        },
        debug: `${s.skill} is NCLC ${s.estimatedNclc}, target ${s.targetNclc} (gap ${gap})${examSoon ? `, exam in ${daysToExam}d` : ""}`,
      });
    }

    // 3) Recent regression.
    if (s.trend < -0.15 && s.attempts >= 4) {
      out.push({
        id: `regress:${s.skill}`,
        skill: s.skill,
        reasonCode: "RECENT_REGRESSION",
        action: "targeted_practice",
        priority: clamp(48 + Math.abs(s.trend) * 40, 0, 100),
        estimatedMinutes: practiceMinutes(ctx),
        params: { skill: s.skill, drop: Math.round(Math.abs(s.trend) * 100) },
        debug: `${s.skill} recent accuracy dropped ~${Math.round(Math.abs(s.trend) * 100)}%`,
      });
    }

    // 4) Weak skill (low mastery with enough data).
    if (s.attempts >= 3 && s.mastery < 0.5) {
      out.push({
        id: `weak:${s.skill}`,
        skill: s.skill,
        reasonCode: "WEAK_SKILL",
        action: "targeted_practice",
        priority: clamp(30 + (0.5 - s.mastery) * 80, 0, 100),
        estimatedMinutes: practiceMinutes(ctx),
        params: { skill: s.skill, mastery: Math.round(s.mastery * 100) },
        debug: `${s.skill} mastery low (${Math.round(s.mastery * 100)}%)`,
      });
    }

    // 5) New / unexplored skill.
    if (s.attempts === 0) {
      out.push({
        id: `new:${s.skill}`,
        skill: s.skill,
        reasonCode: "NEW_SKILL",
        action: "new_skill",
        priority: 33,
        estimatedMinutes: practiceMinutes(ctx),
        params: { skill: s.skill },
        debug: `${s.skill} not started yet`,
      });
    }

    // 6) Low confidence (little evidence yet).
    if (s.attempts > 0 && s.attempts < 6 && s.confidence < 0.4) {
      out.push({
        id: `conf:${s.skill}`,
        skill: s.skill,
        reasonCode: "LOW_CONFIDENCE",
        action: "targeted_practice",
        priority: 28,
        estimatedMinutes: practiceMinutes(ctx),
        params: { skill: s.skill },
        debug: `${s.skill} needs more data to estimate reliably`,
      });
    }

    // 7) Slow pace.
    if (s.slowPace && s.attempts >= 5) {
      out.push({
        id: `pace:${s.skill}`,
        skill: s.skill,
        reasonCode: "PACE_TOO_SLOW",
        action: "targeted_practice",
        priority: 26,
        estimatedMinutes: practiceMinutes(ctx),
        params: { skill: s.skill },
        debug: `${s.skill} answers are slow relative to the time budget`,
      });
    }

    // 8) Maintain a strong skill that's been idle.
    if (
      s.mastery >= 0.8 &&
      s.lastPracticedAt &&
      daysBetween(s.lastPracticedAt, ctx.now) >= 7 &&
      gap === 0
    ) {
      out.push({
        id: `maintain:${s.skill}`,
        skill: s.skill,
        reasonCode: "MAINTAIN_MASTERY",
        action: "maintain",
        priority: 18,
        estimatedMinutes: Math.min(8, practiceMinutes(ctx)),
        params: { skill: s.skill, idleDays: daysBetween(s.lastPracticedAt, ctx.now) },
        debug: `${s.skill} strong but idle ${daysBetween(s.lastPracticedAt, ctx.now)}d`,
      });
    }
  }

  // Full mock when the exam is close and the learner has broad coverage.
  const started = ctx.skills.filter((s) => s.attempts > 0).length;
  if (examSoon && started >= 3) {
    out.push({
      id: "mock:full",
      skill: null,
      reasonCode: "EXAM_SOON",
      action: "mock",
      priority: clamp(50 + (21 - (daysToExam ?? 21)), 0, 100),
      estimatedMinutes: 167,
      params: { daysToExam: daysToExam ?? -1 },
      debug: `exam in ${daysToExam}d — take a full mock`,
    });
  }

  // Highest priority first; stable tie-break by id for determinism.
  out.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  return out;
}

/** The single most valuable next action (dashboard hero). */
export function primaryRecommendation(ctx: RecommendContext): Recommendation | null {
  return recommend(ctx)[0] ?? null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
