import { describe, expect, it } from "vitest";
import { INITIAL_MASTERY, masteryLabel, responseSignal, updateMastery } from "./index";

describe("responseSignal", () => {
  it("rewards correct answers on harder items more", () => {
    expect(responseSignal(true, "C2")).toBeGreaterThan(responseSignal(true, "A1"));
  });
  it("punishes wrong answers on easier items more", () => {
    expect(responseSignal(false, "A1")).toBeLessThan(responseSignal(false, "C2"));
  });
});

describe("updateMastery", () => {
  it("rises with a correct answer and falls with a wrong one", () => {
    const up = updateMastery(INITIAL_MASTERY, { correct: true, cefr: "B2" });
    expect(up.mastery).toBeGreaterThan(INITIAL_MASTERY.mastery);
    const down = updateMastery(INITIAL_MASTERY, { correct: false, cefr: "A2" });
    expect(down.mastery).toBeLessThan(INITIAL_MASTERY.mastery);
  });

  it("increases confidence with attempts", () => {
    let s = INITIAL_MASTERY;
    const first = updateMastery(s, { correct: true, cefr: "B1" }).confidence;
    for (let i = 0; i < 20; i++) s = updateMastery(s, { correct: true, cefr: "B1" });
    expect(s.confidence).toBeGreaterThan(first);
    expect(s.confidence).toBeLessThanOrEqual(1);
  });

  it("tracks a negative trend when recent performance drops", () => {
    let s = INITIAL_MASTERY;
    for (let i = 0; i < 8; i++) s = updateMastery(s, { correct: true, cefr: "B1" });
    for (let i = 0; i < 4; i++) s = updateMastery(s, { correct: false, cefr: "B1" });
    expect(s.trend).toBeLessThan(0);
  });

  it("converges toward high mastery after sustained success on hard items", () => {
    let s = INITIAL_MASTERY;
    for (let i = 0; i < 30; i++) s = updateMastery(s, { correct: true, cefr: "C1" });
    expect(s.mastery).toBeGreaterThan(0.8);
    expect(masteryLabel(s.mastery)).toBe("strong");
  });

  it("keeps mastery within [0,1]", () => {
    let s = INITIAL_MASTERY;
    for (let i = 0; i < 50; i++) s = updateMastery(s, { correct: i % 2 === 0, cefr: "B2" });
    expect(s.mastery).toBeGreaterThanOrEqual(0);
    expect(s.mastery).toBeLessThanOrEqual(1);
  });
});
