/**
 * Pure billing rules (no I/O) — shared by the webhook, the success redirect, the plan resolver
 * and the pricing page, and unit-tested directly.
 */

/**
 * Subscription statuses that keep Premium on. `past_due` is included on purpose: Stripe retries a
 * failed renewal for a while (Smart Retries) and the learner keeps access during that window; if
 * every retry fails Stripe moves the subscription to `canceled`/`unpaid` and access stops.
 */
export const PREMIUM_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export function isPremiumSubscriptionStatus(status: string | null | undefined): boolean {
  return (PREMIUM_SUBSCRIPTION_STATUSES as readonly string[]).includes(status ?? "");
}

export const DEFAULT_PASS_DAYS = 30;

/**
 * Access length for a one-time (non-recurring) Premium pass. Precedence: the price's
 * `access_days` metadata (set in the Stripe Dashboard, so price and duration change together) →
 * `PREMIUM_PASS_DAYS` env → 30 days.
 */
export function passDays(
  priceMetadata?: Record<string, string> | null,
  env: Record<string, string | undefined> = process.env,
): number {
  for (const raw of [priceMetadata?.access_days, env.PREMIUM_PASS_DAYS]) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0 && n <= 3660) return n;
  }
  return DEFAULT_PASS_DAYS;
}

/** A new pass stacks on top of any pass still running, so buying early never loses days. */
export function passExpiry(now: Date, currentExpiry: Date | null, days: number): Date {
  const start = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return new Date(start.getTime() + days * 86_400_000);
}

// ── price display ────────────────────────────────────────────────────────────

const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

export function formatMoney(amountMinor: number, currency: string, locale = "fr-CA"): string {
  const cur = currency.toLowerCase();
  const major = ZERO_DECIMAL.has(cur) ? amountMinor : amountMinor / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur.toUpperCase(),
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: ZERO_DECIMAL.has(cur) ? 0 : 2,
  }).format(major);
}

type Interval = "day" | "week" | "month" | "year";
const UNIT: Record<Interval, [string, string]> = {
  day: ["jour", "jours"],
  week: ["semaine", "semaines"],
  month: ["mois", "mois"],
  year: ["an", "ans"],
};

/** "/ mois", "/ 3 mois", "/ an" for subscriptions; "accès 30 jours" for one-time passes. */
export function cadenceLabel(
  recurring: { interval: Interval; interval_count: number } | null,
  days: number,
): string {
  if (!recurring) return `accès ${days} jours, sans renouvellement`;
  const [one, many] = UNIT[recurring.interval];
  return recurring.interval_count === 1 ? `/ ${one}` : `/ ${recurring.interval_count} ${many}`;
}
