/**
 * Price-intent experiment configuration.
 *
 * During the Private Beta we take NO real payment. This module only describes the price we are
 * *testing* and validates the intent payload. Everything is configurable here — never hard-code a
 * price in a component.
 *
 * Honesty rules baked in: no countdown, no fake "N people bought", no invented discount. The only
 * claim we make is the one that is true — payments are not enabled yet.
 */
export interface PriceVariant {
  /** stable id recorded with every intent so results can be segmented */
  id: string;
  currency: "CNY" | "CAD" | "USD";
  /** amount in major units (e.g. 49 = ¥49) */
  amount: number;
  display: string;
  /** one-time purchase vs recurring, as presented in this variant */
  model: "one_time" | "monthly";
  label: string;
}

/** The early-bird price signalled by the professional reviewer (~50 RMB), plus equivalents. */
export const PRICE_VARIANTS: readonly PriceVariant[] = [
  {
    id: "eb49-cny-one-time",
    currency: "CNY",
    amount: 49,
    display: "49 ¥",
    model: "one_time",
    label: "Accès anticipé — paiement unique",
  },
  {
    id: "eb9-cad-one-time",
    currency: "CAD",
    amount: 9,
    display: "9 $ CA",
    model: "one_time",
    label: "Early access — one-time",
  },
  {
    id: "eb7-usd-one-time",
    currency: "USD",
    amount: 7,
    display: "7 $ US",
    model: "one_time",
    label: "Early access — one-time",
  },
] as const;

export const DEFAULT_VARIANT_ID = "eb49-cny-one-time";

export function variantById(id: string | null | undefined): PriceVariant {
  return PRICE_VARIANTS.find((v) => v.id === id) ?? PRICE_VARIANTS[0]!;
}

/** Locale → the variant we show by default. Users can still switch currency. */
export function variantForLocale(locale: string | null | undefined): PriceVariant {
  if (locale === "zh") return variantById("eb49-cny-one-time");
  if (locale === "en") return variantById("eb9-cad-one-time");
  return variantById(DEFAULT_VARIANT_ID);
}

export const WILLINGNESS = ["yes", "maybe", "no"] as const;
export const MODEL_PREFERENCE = ["one_time", "monthly", "no_preference"] as const;
export const PRICE_BANDS = ["lt_30", "30_60", "60_120", "gt_120", "free_only"] as const;
export const BUY_REASONS = [
  "full_mock_exams",
  "mistake_notebook",
  "audio_quality",
  "explanations",
  "study_plan",
  "price",
] as const;
export const BLOCKERS = [
  "content_not_complete",
  "audio_not_human",
  "unsure_accuracy",
  "too_expensive",
  "prefer_free",
  "trust_new_product",
] as const;

export type Willingness = (typeof WILLINGNESS)[number];
export type ModelPreference = (typeof MODEL_PREFERENCE)[number];
export type PriceBand = (typeof PRICE_BANDS)[number];

export interface PriceIntentInput {
  variantId: string;
  willingness: Willingness;
  modelPreference?: ModelPreference | null;
  priceBand?: PriceBand | null;
  reason?: string | null;
  blocker?: string | null;
  comment?: string | null;
}

/** Normalised payload safe to persist (no undefined, no unknown enum values). */
export interface NormalisedIntent {
  variantId: string;
  willingness: Willingness;
  modelPreference: ModelPreference;
  priceBand: PriceBand | null;
  reason: string | null;
  blocker: string | null;
  comment: string | null;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: NormalisedIntent;
}

/** Validate + normalise. Unknown enum values are rejected rather than silently stored. */
export function validateIntent(input: Partial<PriceIntentInput>): ValidationResult {
  const errors: string[] = [];
  const variant = PRICE_VARIANTS.find((v) => v.id === input.variantId);
  if (!variant) errors.push("unknown_variant");
  if (!input.willingness || !WILLINGNESS.includes(input.willingness)) {
    errors.push("missing_or_invalid_willingness");
  }
  if (input.modelPreference && !MODEL_PREFERENCE.includes(input.modelPreference)) {
    errors.push("invalid_model_preference");
  }
  if (input.priceBand && !PRICE_BANDS.includes(input.priceBand)) errors.push("invalid_price_band");
  if (input.reason && !BUY_REASONS.includes(input.reason as (typeof BUY_REASONS)[number])) {
    errors.push("invalid_reason");
  }
  if (input.blocker && !BLOCKERS.includes(input.blocker as (typeof BLOCKERS)[number])) {
    errors.push("invalid_blocker");
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      variantId: variant!.id,
      willingness: input.willingness as Willingness,
      modelPreference: (input.modelPreference ?? "no_preference") as ModelPreference,
      priceBand: (input.priceBand ?? null) as PriceBand | null,
      reason: input.reason ?? null,
      blocker: input.blocker ?? null,
      comment: (input.comment ?? "").trim().slice(0, 1000) || null,
    },
  };
}

export interface IntentTally {
  total: number;
  yes: number;
  maybe: number;
  no: number;
}

/** Conversion signal from raw counts. Returns null rates when there is no data (never 0/0 = 0%). */
export function intentSummary(t: IntentTally): {
  yesRate: number | null;
  positiveRate: number | null;
  sample: number;
} {
  if (t.total <= 0) return { yesRate: null, positiveRate: null, sample: 0 };
  return {
    yesRate: t.yes / t.total,
    positiveRate: (t.yes + t.maybe) / t.total,
    sample: t.total,
  };
}
