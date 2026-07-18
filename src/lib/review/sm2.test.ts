import { describe, expect, it } from "vitest";
import { INITIAL_SM2, isLeech, qualityFromResponse, review } from "./sm2";

const NOW = new Date("2026-07-18T12:00:00Z");

describe("review (SM-2)", () => {
  it("schedules 1 then 6 days on the first two successful reviews", () => {
    const r1 = review(INITIAL_SM2, 5, NOW);
    expect(r1.intervalDays).toBe(1);
    expect(r1.repetitions).toBe(1);
    const r2 = review(r1, 5, NOW);
    expect(r2.intervalDays).toBe(6);
    expect(r2.repetitions).toBe(2);
    const r3 = review(r2, 5, NOW);
    expect(r3.intervalDays).toBeGreaterThan(6);
  });

  it("resets and counts a lapse on failure", () => {
    const good = review(review(review(INITIAL_SM2, 5, NOW), 4, NOW), 5, NOW);
    const failed = review(good, 1, NOW);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
    expect(failed.lapses).toBe(1);
  });

  it("keeps the ease factor at or above 1.3", () => {
    let s = INITIAL_SM2;
    for (let i = 0; i < 10; i++) s = review(s, 0, NOW);
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("caps the interval", () => {
    let s = INITIAL_SM2;
    for (let i = 0; i < 20; i++) s = review(s, 5, NOW);
    expect(s.intervalDays).toBeLessThanOrEqual(180);
  });

  it("sets dueAt = now + interval days", () => {
    const r = review(INITIAL_SM2, 5, NOW);
    expect(r.dueAt.getTime()).toBe(NOW.getTime() + 24 * 3600 * 1000);
  });
});

describe("qualityFromResponse", () => {
  it("gives full marks for a fast correct answer", () => {
    expect(qualityFromResponse({ correct: true, responseMs: 3000, estimatedMs: 8000 })).toBe(5);
  });
  it("penalizes slowness but never below the pass threshold", () => {
    expect(qualityFromResponse({ correct: true, responseMs: 30000, estimatedMs: 8000 })).toBe(3);
  });
  it("treats wrong answers as a lapse (< 3)", () => {
    expect(qualityFromResponse({ correct: false })).toBeLessThan(3);
    expect(qualityFromResponse({ correct: false, hintUsed: true })).toBeLessThan(3);
  });
});

describe("isLeech", () => {
  it("flags chronically failed items", () => {
    expect(isLeech({ ...INITIAL_SM2, lapses: 4 })).toBe(true);
    expect(isLeech({ ...INITIAL_SM2, lapses: 2 })).toBe(false);
  });
});
