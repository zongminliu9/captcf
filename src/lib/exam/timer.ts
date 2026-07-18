/**
 * Server-authoritative exam timing. The client never decides how much time is left:
 * the server stores `startedAt` + `durationSeconds`, and remaining time is always
 * computed from the server clock. This makes the timer refresh-, reopen- and
 * clock-tamper-proof (see mock engine + timer.test.ts).
 */

export interface TimerState {
  startedAt: Date;
  durationSeconds: number;
  /** Accumulated paused milliseconds (learning mode only; 0 for mock exams). */
  pausedMs?: number;
  /** If currently paused, when the pause began. */
  pausedAt?: Date | null;
}

export function deadline(state: TimerState): Date {
  return new Date(state.startedAt.getTime() + state.durationSeconds * 1000 + (state.pausedMs ?? 0));
}

/** Whole seconds remaining, never negative. Counts frozen time while paused. */
export function remainingSeconds(state: TimerState, now: Date = new Date()): number {
  const pausedMs = state.pausedMs ?? 0;
  const frozen = state.pausedAt ? now.getTime() - state.pausedAt.getTime() : 0;
  const elapsedMs = now.getTime() - state.startedAt.getTime() - pausedMs - frozen;
  const remainingMs = state.durationSeconds * 1000 - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isExpired(state: TimerState, now: Date = new Date()): boolean {
  return remainingSeconds(state, now) <= 0;
}

/** Clamp a client-reported elapsed time to the server-computed bound (anti-tamper). */
export function serverGuardedElapsed(state: TimerState, now: Date = new Date()): number {
  const total = state.durationSeconds;
  return Math.min(total, total - remainingSeconds(state, now));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
