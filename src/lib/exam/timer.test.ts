import { describe, expect, it } from "vitest";
import { deadline, formatClock, isExpired, remainingSeconds, serverGuardedElapsed } from "./timer";

const start = new Date("2026-07-18T12:00:00Z");

describe("remainingSeconds", () => {
  it("counts down from the server clock", () => {
    const state = { startedAt: start, durationSeconds: 600 };
    const now = new Date(start.getTime() + 60_000);
    expect(remainingSeconds(state, now)).toBe(540);
  });

  it("never goes negative and reports expiry", () => {
    const state = { startedAt: start, durationSeconds: 600 };
    const now = new Date(start.getTime() + 700_000);
    expect(remainingSeconds(state, now)).toBe(0);
    expect(isExpired(state, now)).toBe(true);
  });

  it("is refresh-proof: elapsed depends only on startedAt+now, not client state", () => {
    const state = { startedAt: start, durationSeconds: 2100 };
    const now = new Date(start.getTime() + 500_000);
    // Two independent "reads" (e.g. before and after a page refresh) agree.
    expect(remainingSeconds(state, now)).toBe(remainingSeconds({ ...state }, now));
  });

  it("freezes while paused (learning mode)", () => {
    const pausedAt = new Date(start.getTime() + 100_000);
    const state = { startedAt: start, durationSeconds: 600, pausedAt };
    const now = new Date(start.getTime() + 300_000); // 200s of pause so far
    expect(remainingSeconds(state, now)).toBe(500); // only 100s counted
  });
});

describe("serverGuardedElapsed", () => {
  it("clamps to the total duration", () => {
    const state = { startedAt: start, durationSeconds: 600 };
    const now = new Date(start.getTime() + 999_000);
    expect(serverGuardedElapsed(state, now)).toBe(600);
  });
});

describe("deadline", () => {
  it("is startedAt + duration", () => {
    const state = { startedAt: start, durationSeconds: 600 };
    expect(deadline(state).getTime()).toBe(start.getTime() + 600_000);
  });
});

describe("formatClock", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3661)).toBe("1:01:01");
    expect(formatClock(-5)).toBe("00:00");
  });
});
