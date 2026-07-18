import { describe, expect, it } from "vitest";
import { can, capBankItems, withinDailyLimit } from "./index";

describe("can", () => {
  it("gates premium features off for free", () => {
    expect(can("free", "full_mock_tests")).toBe(false);
    expect(can("free", "ai_feedback")).toBe(false);
    expect(can("premium", "full_mock_tests")).toBe(true);
    expect(can("premium", "advanced_analytics")).toBe(true);
  });
});

describe("withinDailyLimit", () => {
  it("enforces the free practice cap", () => {
    expect(withinDailyLimit("free", "practice", 4).allowed).toBe(true);
    expect(withinDailyLimit("free", "practice", 5).allowed).toBe(false);
    expect(withinDailyLimit("free", "practice", 5).remaining).toBe(0);
  });
  it("gives premium unlimited practice", () => {
    expect(withinDailyLimit("premium", "practice", 999).allowed).toBe(true);
  });
  it("blocks full mocks for free users", () => {
    expect(withinDailyLimit("free", "mock", 0).allowed).toBe(false);
    expect(withinDailyLimit("premium", "mock", 3).allowed).toBe(true);
  });
});

describe("capBankItems", () => {
  it("caps the free bank and flags it", () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const free = capBankItems("free", items);
    expect(free.items.length).toBe(60);
    expect(free.capped).toBe(true);
    const premium = capBankItems("premium", items);
    expect(premium.items.length).toBe(100);
    expect(premium.capped).toBe(false);
  });
});
