import "server-only";
import { logger } from "@/lib/logger";
import { cadenceLabel, formatMoney, passDays } from "./rules";
import { type StripePrice, getPrice, getStripeConfig } from "./stripe";

export interface PremiumOffer {
  mode: "subscription" | "payment";
  price: StripePrice;
  amountLabel: string;
  cadence: string;
  /** "0 $" in the same currency, for the Free card. */
  zeroLabel: string;
  passDays: number;
}

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; priceId: string; price: StripePrice } | null = null;

/** The configured Premium price, read from Stripe (cached 10 min). Null when payments are off. */
export async function loadPremiumPrice(): Promise<StripePrice | null> {
  const cfg = getStripeConfig();
  if (!cfg) return null;
  if (cache && cache.priceId === cfg.priceId && Date.now() - cache.at < TTL_MS) return cache.price;
  const price = await getPrice(cfg.priceId);
  cache = { at: Date.now(), priceId: cfg.priceId, price };
  return price;
}

/** Display-ready offer for the pricing page. Null if payments are off or Stripe is unreachable. */
export async function getPremiumOffer(): Promise<PremiumOffer | null> {
  try {
    const price = await loadPremiumPrice();
    if (!price || !price.active || price.unit_amount == null) return null;
    const days = passDays(price.metadata);
    return {
      mode: price.type === "recurring" ? "subscription" : "payment",
      price,
      amountLabel: formatMoney(price.unit_amount, price.currency),
      cadence: cadenceLabel(price.recurring, days),
      zeroLabel: formatMoney(0, price.currency),
      passDays: days,
    };
  } catch (e) {
    logger.error("billing: could not load the Premium price", { error: (e as Error).message });
    return null;
  }
}
