/**
 * Practice score ESTIMATION for the QCM sections.
 *
 * This is an unofficial, transparent, difficulty-aware estimator — NOT the official
 * IRT-based TCF scoring. Every surface that shows these numbers must label them as
 * estimates (see `ScoreEstimate.confidence` and the `disclaimer` field).
 */
import { type CefrLevel, CEFR_ORDER, type SkillId } from "./config";
import { scoreToCefr, scoreToNclc } from "./nclc";

/** Midpoint anchor (on the 0–699 scale) for each CEFR level. */
export const CEFR_ANCHOR: Record<CefrLevel, number> = {
  A1: 150,
  A2: 250,
  B1: 350,
  B2: 450,
  C1: 550,
  C2: 650,
};

export interface QcmResponseLite {
  cefr: CefrLevel;
  correct: boolean;
}

export type Confidence = "low" | "medium" | "high";

export interface ScoreEstimate {
  score: number; // 0–699
  cefr: CefrLevel | "below-A1";
  nclc: number;
  confidence: Confidence;
  answered: number;
  correct: number;
  accuracy: number; // 0..1
  disclaimer: string;
}

const DISCLAIMER =
  "Unofficial practice estimate based on this session only. It reflects the current exam structure but does not replace an official TCF Canada result.";

/**
 * Difficulty-weighted estimate: a correct item pulls the estimate toward its own
 * CEFR anchor; an incorrect item pulls it toward one level below. The mean of those
 * targets is the estimate. Monotonic in correctness and sensitive to difficulty.
 */
export function estimateQcmScore(skill: SkillId, responses: QcmResponseLite[]): ScoreEstimate {
  const answered = responses.length;
  const correct = responses.filter((r) => r.correct).length;
  const accuracy = answered === 0 ? 0 : correct / answered;

  if (answered === 0) {
    return {
      score: 0,
      cefr: "below-A1",
      nclc: 0,
      confidence: "low",
      answered: 0,
      correct: 0,
      accuracy: 0,
      disclaimer: DISCLAIMER,
    };
  }

  let sum = 0;
  for (const r of responses) {
    const anchor = CEFR_ANCHOR[r.cefr];
    sum += r.correct ? anchor : Math.max(50, anchor - 150);
  }
  const score = clamp(Math.round(sum / answered), 0, 699);

  // confidence rises with item count and CEFR coverage
  const levels = new Set(responses.map((r) => r.cefr)).size;
  let confidence: Confidence = "low";
  if (answered >= 20 && levels >= 3) confidence = "high";
  else if (answered >= 8 && levels >= 2) confidence = "medium";

  return {
    score,
    cefr: scoreToCefr(skill, score),
    nclc: scoreToNclc(skill, score),
    confidence,
    answered,
    correct,
    accuracy,
    disclaimer: DISCLAIMER,
  };
}

/** Weighted accuracy that gives more credit for harder items (for analytics). */
export function difficultyWeightedAccuracy(responses: QcmResponseLite[]): number {
  if (responses.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const r of responses) {
    const w = CEFR_ORDER[r.cefr];
    den += w;
    if (r.correct) num += w;
  }
  return den === 0 ? 0 : num / den;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
