import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN, PLANS, parsePlanId, savingsPercent } from "./plans";

describe("plans", () => {
  it("sells $19/month and $39 every 3 months, auto-renewing", () => {
    const byId = Object.fromEntries(PLANS.map((p) => [p.id, p]));
    expect(byId.monthly).toMatchObject({ unitAmount: 1900, currency: "usd", intervalCount: 1 });
    expect(byId.quarterly).toMatchObject({ unitAmount: 3900, currency: "usd", intervalCount: 3 });
    // lookup keys are unique and encode the amount (a price change → a new Stripe price)
    expect(new Set(PLANS.map((p) => p.lookupKey)).size).toBe(PLANS.length);
    for (const p of PLANS) expect(p.lookupKey).toContain(String(p.unitAmount));
  });

  it("parses the plan from untrusted input, defaulting safely", () => {
    expect(parsePlanId("quarterly")).toBe("quarterly");
    expect(parsePlanId("monthly")).toBe("monthly");
    for (const junk of [null, undefined, "", "yearly", "__proto__", 3]) {
      expect(parsePlanId(junk)).toBe(DEFAULT_PLAN);
    }
  });

  it("computes the 3-month saving", () => {
    expect(savingsPercent(1900, 3900, 3)).toBe(32); // 39 vs 57
    expect(savingsPercent(1900, 1900, 1)).toBe(0);
  });
});
