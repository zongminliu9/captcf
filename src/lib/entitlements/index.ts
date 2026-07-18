/**
 * Entitlements: a real gating layer (not just a pricing page).
 *
 * Plans map to a feature matrix. Server routes check `can()` / `withinDailyLimit()`
 * before performing gated actions. The dev "simulator" provider grants Premium locally
 * so testing is never blocked by the absence of Stripe keys.
 */

export type Plan = "free" | "premium";

export type Feature =
  | "full_mock_tests" // beyond the single free sample form
  | "unlimited_custom_practice"
  | "full_question_bank"
  | "advanced_analytics"
  | "ai_feedback"
  | "full_study_plan"
  | "deep_mistake_analysis";

export interface PlanLimits {
  /** Practice sessions per calendar day (Infinity = unlimited). */
  practiceSessionsPerDay: number;
  /** Full mock exams a user may start per day. */
  mockTestsPerDay: number;
  /** How many bank items are reachable in free mode (null = all). */
  bankItemCap: number | null;
  features: Record<Feature, boolean>;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    practiceSessionsPerDay: 5,
    mockTestsPerDay: 0, // free users get the dedicated "sample" mock, gated separately
    bankItemCap: 60,
    features: {
      full_mock_tests: false,
      unlimited_custom_practice: false,
      full_question_bank: false,
      advanced_analytics: false,
      ai_feedback: false,
      full_study_plan: false,
      deep_mistake_analysis: false,
    },
  },
  premium: {
    practiceSessionsPerDay: Number.POSITIVE_INFINITY,
    mockTestsPerDay: 10,
    bankItemCap: null,
    features: {
      full_mock_tests: true,
      unlimited_custom_practice: true,
      full_question_bank: true,
      advanced_analytics: true,
      ai_feedback: true,
      full_study_plan: true,
      deep_mistake_analysis: true,
    },
  },
};

export function can(plan: Plan, feature: Feature): boolean {
  return PLAN_LIMITS[plan].features[feature];
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export function withinDailyLimit(
  plan: Plan,
  kind: "practice" | "mock",
  usedToday: number,
): LimitCheck {
  const limit =
    kind === "practice"
      ? PLAN_LIMITS[plan].practiceSessionsPerDay
      : PLAN_LIMITS[plan].mockTestsPerDay;
  const remaining =
    limit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : limit - usedToday;
  return {
    allowed: usedToday < limit,
    used: usedToday,
    limit,
    remaining: Math.max(0, remaining),
  };
}

/** Free users may reach only the first N bank items for a given filter. */
export function capBankItems<T>(plan: Plan, items: T[]): { items: T[]; capped: boolean } {
  const cap = PLAN_LIMITS[plan].bankItemCap;
  if (cap == null || items.length <= cap) return { items, capped: false };
  return { items: items.slice(0, cap), capped: true };
}
