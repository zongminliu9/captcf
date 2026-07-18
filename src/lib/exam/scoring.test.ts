import { describe, expect, it } from "vitest";
import type { CefrLevel } from "./config";
import { difficultyWeightedAccuracy, estimateQcmScore } from "./scoring";

function resp(cefr: CefrLevel, correct: boolean) {
  return { cefr, correct };
}

describe("estimateQcmScore", () => {
  it("returns a zero estimate with no responses", () => {
    const e = estimateQcmScore("listening", []);
    expect(e.score).toBe(0);
    expect(e.confidence).toBe("low");
  });

  it("is monotonic: flipping a wrong answer to correct never lowers the score", () => {
    const base = [resp("B1", false), resp("B1", true), resp("B2", false), resp("A2", true)];
    const better = [resp("B1", true), resp("B1", true), resp("B2", false), resp("A2", true)];
    expect(estimateQcmScore("listening", better).score).toBeGreaterThanOrEqual(
      estimateQcmScore("listening", base).score,
    );
  });

  it("rewards success on harder items", () => {
    const easy = Array.from({ length: 10 }, () => resp("A2", true));
    const hard = Array.from({ length: 10 }, () => resp("C1", true));
    expect(estimateQcmScore("reading", hard).score).toBeGreaterThan(
      estimateQcmScore("reading", easy).score,
    );
  });

  it("computes confidence from breadth + volume", () => {
    const many: ReturnType<typeof resp>[] = [];
    for (const lvl of ["A2", "B1", "B2", "C1"] as CefrLevel[]) {
      for (let i = 0; i < 6; i++) many.push(resp(lvl, i % 2 === 0));
    }
    expect(estimateQcmScore("listening", many).confidence).toBe("high");
    expect(estimateQcmScore("listening", [resp("B1", true), resp("B1", false)]).confidence).toBe(
      "low",
    );
  });

  it("always attaches the unofficial-estimate disclaimer", () => {
    expect(estimateQcmScore("listening", [resp("B1", true)]).disclaimer).toMatch(/unofficial/i);
  });

  it("produces a plausible B2 score for strong B2 performance", () => {
    const responses = [
      ...Array.from({ length: 6 }, () => resp("B1", true)),
      ...Array.from({ length: 6 }, () => resp("B2", true)),
      ...Array.from({ length: 4 }, () => resp("C1", false)),
    ];
    const e = estimateQcmScore("reading", responses);
    expect(e.score).toBeGreaterThanOrEqual(350);
    expect(e.score).toBeLessThanOrEqual(499);
  });
});

describe("difficultyWeightedAccuracy", () => {
  it("weights harder items more heavily", () => {
    const a = difficultyWeightedAccuracy([resp("C2", true), resp("A1", false)]);
    const b = difficultyWeightedAccuracy([resp("A1", true), resp("C2", false)]);
    expect(a).toBeGreaterThan(b);
  });
});
