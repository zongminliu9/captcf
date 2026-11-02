import { describe, expect, it } from "vitest";
import {
  DEFAULT_PASS_DAYS,
  cadenceLabel,
  formatMoney,
  isPremiumSubscriptionStatus,
  passDays,
  passExpiry,
} from "./rules";

describe("isPremiumSubscriptionStatus", () => {
  it("keeps Premium for paying statuses, including the past_due retry window", () => {
    for (const s of ["active", "trialing", "past_due"])
      expect(isPremiumSubscriptionStatus(s)).toBe(true);
  });
  it("drops Premium otherwise", () => {
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "", null])
      expect(isPremiumSubscriptionStatus(s)).toBe(false);
  });
});

describe("passDays", () => {
  it("prefers the price metadata, then env, then the default", () => {
    expect(passDays({ access_days: "90" }, { PREMIUM_PASS_DAYS: "60" })).toBe(90);
    expect(passDays({}, { PREMIUM_PASS_DAYS: "60" })).toBe(60);
    expect(passDays(null, {})).toBe(DEFAULT_PASS_DAYS);
  });
  it("ignores junk values", () => {
    expect(passDays({ access_days: "abc" }, { PREMIUM_PASS_DAYS: "-5" })).toBe(DEFAULT_PASS_DAYS);
    expect(passDays({ access_days: "1.5" }, {})).toBe(DEFAULT_PASS_DAYS);
  });
});

describe("passExpiry", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  it("starts now when nothing is running", () => {
    expect(passExpiry(now, null, 30).toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });
  it("stacks on a pass that is still running (buying early never loses days)", () => {
    const running = new Date("2026-11-12T12:00:00Z");
    expect(passExpiry(now, running, 30).toISOString()).toBe("2026-12-12T12:00:00.000Z");
  });
  it("ignores an already-expired pass", () => {
    const old = new Date("2026-10-01T00:00:00Z");
    expect(passExpiry(now, old, 30).toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });
});

describe("price display", () => {
  // Intl inserts narrow no-break spaces; normalise for stable assertions.
  const norm = (s: string) => s.replace(/\s/g, " ");
  it("formats minor units", () => {
    expect(norm(formatMoney(1999, "cad"))).toBe("19,99 $");
    expect(norm(formatMoney(2000, "cad"))).toBe("20 $");
    expect(norm(formatMoney(0, "cad"))).toBe("0 $");
    expect(norm(formatMoney(1500, "jpy"))).toContain("1 500");
  });
  it("labels the cadence", () => {
    expect(cadenceLabel({ interval: "month", interval_count: 1 }, 30)).toBe("/ mois");
    expect(cadenceLabel({ interval: "month", interval_count: 3 }, 30)).toBe("/ 3 mois");
    expect(cadenceLabel({ interval: "year", interval_count: 1 }, 30)).toBe("/ an");
    expect(cadenceLabel(null, 60)).toBe("accès 60 jours, sans renouvellement");
  });
});
