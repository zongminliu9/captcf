import "server-only";
import { logger } from "@/lib/logger";
import { PLANS, type PlanId, savingsPercent } from "./plans";
import { getStripeSetup } from "./provision";
import { cadenceLabel, formatMoney, passDays } from "./rules";
import type { StripePrice } from "./stripe";

export interface PlanOffer {
  plan: PlanId;
  mode: "subscription" | "payment";
  price: StripePrice;
  amountLabel: string;
  cadence: string;
  /** Saving vs paying monthly for the same period (0 for the monthly plan). */
  savings: number;
  passDays: number;
}

export interface PremiumOffers {
  plans: PlanOffer[];
  /** "0 $ US" in the same currency, for the Free card. */
  zeroLabel: string;
}

function toOffer(plan: PlanId, price: StripePrice, monthlyAmount: number): PlanOffer {
  const days = passDays(price.metadata);
  const months = price.recurring?.interval === "month" ? price.recurring.interval_count : 1;
  return {
    plan,
    mode: price.type === "recurring" ? "subscription" : "payment",
    price,
    amountLabel: formatMoney(price.unit_amount ?? 0, price.currency),
    cadence: cadenceLabel(price.recurring, days),
    savings: savingsPercent(monthlyAmount, price.unit_amount ?? 0, months),
    passDays: days,
  };
}

/** Display-ready Premium plans. Null if payments are off or Stripe is unreachable right now. */
export async function getPremiumOffers(): Promise<PremiumOffers | null> {
  try {
    const setup = await getStripeSetup();
    if (!setup) return null;
    const monthly = setup.prices.monthly?.unit_amount ?? 0;
    const plans = PLANS.flatMap((p) => {
      const price = setup.prices[p.id];
      return price?.active && price.unit_amount != null ? [toOffer(p.id, price, monthly)] : [];
    });
    if (plans.length === 0) return null;
    return { plans, zeroLabel: formatMoney(0, plans[0]!.price.currency) };
  } catch (e) {
    logger.error("billing: could not load Premium prices", { error: (e as Error).message });
    return null;
  }
}

export async function getPlanOffer(plan: PlanId): Promise<PlanOffer | null> {
  const offers = await getPremiumOffers();
  return offers?.plans.find((o) => o.plan === plan) ?? null;
}
