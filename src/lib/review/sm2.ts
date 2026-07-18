/**
 * Spaced repetition (SM-2, adapted for MCQ practice + vocabulary).
 *
 * Differences from vanilla SM-2:
 *  - `quality` is derived from correctness, speed, and hint usage (see `qualityFromResponse`)
 *  - a `lapses` counter drives leech detection in the review queue
 *  - intervals are capped so a single lucky streak can't push an item a year out
 */

export interface Sm2State {
  easeFactor: number; // >= 1.3
  intervalDays: number; // days until next review
  repetitions: number; // consecutive successful reviews
  lapses: number;
}

export const INITIAL_SM2: Sm2State = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};

const MAX_INTERVAL_DAYS = 180;
const MIN_EASE = 1.3;

export interface Sm2Result extends Sm2State {
  dueAt: Date;
}

/** Advance SM-2 state given a review quality (0..5) at time `now`. */
export function review(state: Sm2State, quality: number, now: Date = new Date()): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { easeFactor, intervalDays, repetitions, lapses } = state;

  if (q < 3) {
    // failed recall → reset the schedule, relearn tomorrow, count a lapse
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.max(1, intervalDays));

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.max(MIN_EASE, Number(easeFactor.toFixed(4)));

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { easeFactor, intervalDays, repetitions, lapses, dueAt };
}

export interface ResponseSignal {
  correct: boolean;
  responseMs?: number;
  estimatedMs?: number; // expected time budget for the item
  hintUsed?: boolean;
}

/** Map a practice response to an SM-2 quality (0..5). */
export function qualityFromResponse(sig: ResponseSignal): number {
  if (!sig.correct) {
    // distinguish "close" (answered but wrong) — SM-2 still treats <3 as a lapse
    return sig.hintUsed ? 1 : 2;
  }
  let q = 5;
  if (sig.hintUsed) q -= 1;
  if (sig.responseMs != null && sig.estimatedMs != null && sig.estimatedMs > 0) {
    const ratio = sig.responseMs / sig.estimatedMs;
    if (ratio > 1.5) q -= 1; // slow / hesitant
    if (ratio > 2.5) q -= 1; // very slow
  }
  return Math.max(3, q); // correct answers never drop below the "pass" threshold
}

/** Is the item a leech (chronically failed) and worth surfacing differently? */
export function isLeech(state: Sm2State): boolean {
  return state.lapses >= 4;
}
