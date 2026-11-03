/**
 * The Premium plans on sale. Prices are created in Stripe automatically from this list (matched
 * by `lookupKey`), so changing a price here and redeploying is all it takes: a new Stripe price
 * is created; existing subscribers keep the price they signed up at.
 */
export type PlanId = "monthly" | "quarterly";

export interface PlanDef {
  id: PlanId;
  /** Stable Stripe lookup key — includes the amount so a price change creates a new price. */
  lookupKey: string;
  nickname: string;
  currency: "usd";
  unitAmount: number; // minor units (cents)
  interval: "month";
  intervalCount: number;
}

export const PLANS: readonly PlanDef[] = [
  {
    id: "monthly",
    lookupKey: "captcf_premium_monthly_usd_1900",
    nickname: "CapTCF Premium — 1 mois",
    currency: "usd",
    unitAmount: 1900,
    interval: "month",
    intervalCount: 1,
  },
  {
    id: "quarterly",
    lookupKey: "captcf_premium_quarterly_usd_3900",
    nickname: "CapTCF Premium — 3 mois",
    currency: "usd",
    unitAmount: 3900,
    interval: "month",
    intervalCount: 3,
  },
];

export const DEFAULT_PLAN: PlanId = "monthly";

export function parsePlanId(raw: unknown): PlanId {
  return PLANS.some((p) => p.id === raw) ? (raw as PlanId) : DEFAULT_PLAN;
}

/** Whole-percent saving of a multi-month plan versus paying monthly for the same period. */
export function savingsPercent(monthlyAmount: number, amount: number, months: number): number {
  if (months <= 1 || monthlyAmount <= 0) return 0;
  return Math.round((1 - amount / (monthlyAmount * months)) * 100);
}
