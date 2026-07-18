import { describe, expect, it } from "vitest";
import { minScoreForNclc, overallNclc, scoreToCefr, scoreToNclc } from "./nclc";

describe("scoreToNclc", () => {
  it("maps listening boundaries to the official IRCC levels", () => {
    expect(scoreToNclc("listening", 458)).toBe(7); // NCLC 7 starts at 458
    expect(scoreToNclc("listening", 457)).toBe(6); // one below → NCLC 6
    expect(scoreToNclc("listening", 549)).toBe(10);
    expect(scoreToNclc("listening", 330)).toBe(0); // below NCLC 4
    expect(scoreToNclc("listening", 699)).toBe(10);
  });

  it("uses distinct reading thresholds (453 vs 458 for CLB 7)", () => {
    expect(scoreToNclc("reading", 453)).toBe(7);
    expect(scoreToNclc("reading", 452)).toBe(6);
  });

  it("maps writing/speaking 0-20 correctly", () => {
    expect(scoreToNclc("writing", 10)).toBe(7);
    expect(scoreToNclc("writing", 9)).toBe(6);
    expect(scoreToNclc("speaking", 16)).toBe(10);
    expect(scoreToNclc("speaking", 6)).toBe(5);
    expect(scoreToNclc("speaking", 3)).toBe(0);
  });
});

describe("scoreToCefr", () => {
  it("maps 699-scale bands", () => {
    expect(scoreToCefr("reading", 450)).toBe("B2");
    expect(scoreToCefr("listening", 350)).toBe("B1");
    expect(scoreToCefr("listening", 50)).toBe("below-A1");
  });
  it("maps 20-scale bands", () => {
    expect(scoreToCefr("writing", 12)).toBe("B2");
    expect(scoreToCefr("speaking", 18)).toBe("C2");
  });
});

describe("overallNclc", () => {
  it("is the minimum across skills (IRCC requires all skills at target)", () => {
    expect(overallNclc({ listening: 7, reading: 8, writing: 7, speaking: 6 })).toBe(6);
    expect(overallNclc({})).toBe(0);
  });
});

describe("minScoreForNclc", () => {
  it("returns the lower bound of the target band", () => {
    expect(minScoreForNclc("listening", 7)).toBe(458);
    expect(minScoreForNclc("writing", 7)).toBe(10);
    expect(minScoreForNclc("reading", 99)).toBeNull();
  });
});
