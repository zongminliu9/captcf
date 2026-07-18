import { describe, expect, it } from "vitest";
import type { SkillSnapshot } from "./index";
import { primaryRecommendation, recommend } from "./index";

const NOW = new Date("2026-07-18T12:00:00Z");

function snap(over: Partial<SkillSnapshot> & { skill: SkillSnapshot["skill"] }): SkillSnapshot {
  return {
    mastery: 0.6,
    confidence: 0.6,
    attempts: 10,
    targetNclc: 7,
    estimatedNclc: 7,
    dueReviewCount: 0,
    overdueDays: 0,
    lastPracticedAt: NOW,
    trend: 0,
    slowPace: false,
    ...over,
  };
}

describe("recommend", () => {
  it("returns nothing actionable when everything is on-target and reviewed", () => {
    const recs = recommend({
      now: NOW,
      examDate: null,
      dailyMinutes: 20,
      skills: [snap({ skill: "listening" }), snap({ skill: "reading" })],
    });
    expect(recs.length).toBe(0);
  });

  it("prioritizes due reviews", () => {
    const recs = recommend({
      now: NOW,
      examDate: null,
      dailyMinutes: 20,
      skills: [snap({ skill: "reading", dueReviewCount: 12, overdueDays: 3 })],
    });
    expect(recs[0].reasonCode).toBe("REVIEW_DUE");
    expect(recs[0].params.count).toBe(12);
  });

  it("emits a goal gap and amplifies it near the exam", () => {
    const far = primaryRecommendation({
      now: NOW,
      examDate: new Date(NOW.getTime() + 90 * 864e5),
      dailyMinutes: 20,
      skills: [snap({ skill: "writing", estimatedNclc: 5, targetNclc: 7 })],
    });
    const near = primaryRecommendation({
      now: NOW,
      examDate: new Date(NOW.getTime() + 5 * 864e5),
      dailyMinutes: 20,
      skills: [snap({ skill: "writing", estimatedNclc: 5, targetNclc: 7, attempts: 10 })],
    });
    expect(far?.reasonCode).toBe("GOAL_GAP");
    expect(near?.reasonCode).toBe("EXAM_SOON");
    expect(near!.priority).toBeGreaterThan(far!.priority);
  });

  it("flags a recent regression", () => {
    const recs = recommend({
      now: NOW,
      examDate: null,
      dailyMinutes: 20,
      skills: [snap({ skill: "listening", trend: -0.3, attempts: 12 })],
    });
    expect(recs.some((r) => r.reasonCode === "RECENT_REGRESSION")).toBe(true);
  });

  it("suggests starting a new skill", () => {
    const recs = recommend({
      now: NOW,
      examDate: null,
      dailyMinutes: 20,
      skills: [snap({ skill: "speaking", attempts: 0 })],
    });
    expect(recs.some((r) => r.reasonCode === "NEW_SKILL")).toBe(true);
  });

  it("recommends a full mock when the exam is close and coverage is broad", () => {
    const recs = recommend({
      now: NOW,
      examDate: new Date(NOW.getTime() + 7 * 864e5),
      dailyMinutes: 60,
      skills: [
        snap({ skill: "listening" }),
        snap({ skill: "reading" }),
        snap({ skill: "writing" }),
        snap({ skill: "speaking" }),
      ],
    });
    expect(recs.some((r) => r.action === "mock")).toBe(true);
  });

  it("is deterministic (stable ordering)", () => {
    const ctx = {
      now: NOW,
      examDate: null,
      dailyMinutes: 20,
      skills: [
        snap({ skill: "listening", dueReviewCount: 3 }),
        snap({ skill: "reading", mastery: 0.3, attempts: 5 }),
      ],
    };
    expect(recommend(ctx).map((r) => r.id)).toEqual(recommend(ctx).map((r) => r.id));
  });
});
