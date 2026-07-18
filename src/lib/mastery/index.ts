/**
 * Transparent mastery model per (skill, subtype).
 *
 * mastery ∈ [0,1] is a difficulty-weighted exponential moving average of a per-response
 * signal. Getting a hard item right raises mastery more than an easy one; getting an easy
 * item wrong hurts more than missing a hard one. `confidence` grows with attempts.
 * Nothing here is a black box — the UI can explain every number.
 */
import { type CefrLevel, CEFR_ORDER } from "../exam/config";

export interface MasteryState {
  mastery: number; // 0..1
  confidence: number; // 0..1
  attempts: number;
  recentAccuracy: number; // EMA of correctness, 0..1
  longTermAccuracy: number; // cumulative correct / attempts
  correctTotal: number;
  avgResponseMs: number;
  lastPracticedAt: Date | null;
  trend: number; // recent - long-term, roughly [-1,1]
}

export const INITIAL_MASTERY: MasteryState = {
  mastery: 0.35,
  confidence: 0,
  attempts: 0,
  recentAccuracy: 0,
  longTermAccuracy: 0,
  correctTotal: 0,
  avgResponseMs: 0,
  lastPracticedAt: null,
  trend: 0,
};

export interface MasteryInput {
  correct: boolean;
  cefr: CefrLevel;
  responseMs?: number;
  at?: Date;
}

/** Signal in [0,1] representing how much a response demonstrates ability. */
export function responseSignal(correct: boolean, cefr: CefrLevel): number {
  const order = CEFR_ORDER[cefr]; // 1..6
  if (correct) return clamp01(0.55 + 0.09 * (order - 1)); // A1→0.55 … C2→1.0
  return clamp01(0.45 - 0.09 * (6 - order)); // C2 wrong→0.45 … A1 wrong→0.0
}

export function updateMastery(prev: MasteryState, input: MasteryInput): MasteryState {
  const attempts = prev.attempts + 1;
  const signal = responseSignal(input.correct, input.cefr);

  // learning rate decays as attempts accumulate → stable but still responsive
  const alpha = clamp(2 / (attempts + 3), 0.12, 0.5);
  const mastery = clamp01(prev.mastery + alpha * (signal - prev.mastery));

  const recentAlpha = 0.35;
  const recentAccuracy =
    prev.attempts === 0
      ? input.correct
        ? 1
        : 0
      : clamp01(prev.recentAccuracy + recentAlpha * ((input.correct ? 1 : 0) - prev.recentAccuracy));

  const correctTotal = prev.correctTotal + (input.correct ? 1 : 0);
  const longTermAccuracy = correctTotal / attempts;

  const avgResponseMs =
    input.responseMs != null
      ? Math.round((prev.avgResponseMs * prev.attempts + input.responseMs) / attempts)
      : prev.avgResponseMs;

  // confidence saturates toward 1 as attempts grow
  const confidence = clamp01(1 - 1 / Math.sqrt(attempts + 1));

  return {
    mastery,
    confidence,
    attempts,
    recentAccuracy,
    longTermAccuracy,
    correctTotal,
    avgResponseMs,
    lastPracticedAt: input.at ?? new Date(),
    trend: clamp(recentAccuracy - longTermAccuracy, -1, 1),
  };
}

/** Human label for a mastery value. */
export function masteryLabel(m: number): "novice" | "developing" | "proficient" | "strong" {
  if (m < 0.4) return "novice";
  if (m < 0.6) return "developing";
  if (m < 0.8) return "proficient";
  return "strong";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
