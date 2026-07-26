import { describe, expect, it } from "vitest";
import {
  DEFAULT_VARIANT_ID,
  PRICE_VARIANTS,
  intentSummary,
  validateIntent,
  variantById,
  variantForLocale,
} from "./experiment";

describe("price variants", () => {
  it("exposes the ~50 RMB early-bird signal and equivalents, all one-time", () => {
    const cny = variantById("eb49-cny-one-time");
    expect(cny.amount).toBe(49);
    expect(cny.currency).toBe("CNY");
    expect(PRICE_VARIANTS.every((v) => v.model === "one_time")).toBe(true);
  });

  it("falls back to the default variant for unknown ids", () => {
    expect(variantById("nope").id).toBe(DEFAULT_VARIANT_ID);
    expect(variantById(null).id).toBe(DEFAULT_VARIANT_ID);
  });

  it("picks a sensible currency per locale", () => {
    expect(variantForLocale("zh").currency).toBe("CNY");
    expect(variantForLocale("en").currency).toBe("CAD");
    expect(variantForLocale("fr").id).toBe(DEFAULT_VARIANT_ID);
  });
});

describe("intent validation", () => {
  it("accepts a complete answer and normalises optional fields", () => {
    const r = validateIntent({
      variantId: "eb49-cny-one-time",
      willingness: "yes",
      priceBand: "30_60",
      reason: "mistake_notebook",
      comment: "  utile  ",
    });
    expect(r.ok).toBe(true);
    expect(r.value?.modelPreference).toBe("no_preference");
    expect(r.value?.comment).toBe("utile");
    expect(r.value?.blocker).toBeNull();
  });

  it("rejects unknown variants and enum values instead of storing junk", () => {
    expect(validateIntent({ variantId: "fake", willingness: "yes" }).errors).toContain(
      "unknown_variant",
    );
    expect(
      validateIntent({ variantId: "eb49-cny-one-time", willingness: "sure" as never }).errors,
    ).toContain("missing_or_invalid_willingness");
    expect(
      validateIntent({
        variantId: "eb49-cny-one-time",
        willingness: "no",
        priceBand: "cheap" as never,
      }).errors,
    ).toContain("invalid_price_band");
    expect(
      validateIntent({
        variantId: "eb49-cny-one-time",
        willingness: "no",
        blocker: "whatever" as never,
      }).errors,
    ).toContain("invalid_blocker");
  });

  it("requires willingness (the one non-skippable field)", () => {
    expect(validateIntent({ variantId: "eb49-cny-one-time" }).ok).toBe(false);
  });

  it("caps overly long free-text comments", () => {
    const r = validateIntent({
      variantId: "eb49-cny-one-time",
      willingness: "maybe",
      comment: "x".repeat(5000),
    });
    expect(r.value?.comment?.length).toBe(1000);
  });
});

describe("intent summary", () => {
  it("never reports a rate without data (no fake 0%)", () => {
    const s = intentSummary({ total: 0, yes: 0, maybe: 0, no: 0 });
    expect(s.yesRate).toBeNull();
    expect(s.positiveRate).toBeNull();
    expect(s.sample).toBe(0);
  });

  it("computes honest yes / positive rates", () => {
    const s = intentSummary({ total: 10, yes: 3, maybe: 4, no: 3 });
    expect(s.yesRate).toBeCloseTo(0.3);
    expect(s.positiveRate).toBeCloseTo(0.7);
    expect(s.sample).toBe(10);
  });
});
