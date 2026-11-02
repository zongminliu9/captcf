import { describe, expect, it } from "vitest";
import {
  encodeForm,
  signStripePayload,
  subscriptionPeriodEnd,
  verifyStripeSignature,
} from "./stripe";

describe("encodeForm", () => {
  it("encodes nested objects and arrays the way Stripe expects", () => {
    const body = encodeForm({
      mode: "subscription",
      line_items: [{ price: "price_1", quantity: 1 }],
      metadata: { userId: "u-1" },
      allow_promotion_codes: true,
      skipped: undefined,
      alsoSkipped: null,
      success_url: "https://x.test/ok?session_id={CHECKOUT_SESSION_ID}",
    });
    const pairs = body.split("&").map(decodeURIComponent);
    expect(pairs).toEqual([
      "mode=subscription",
      "line_items[0][price]=price_1",
      "line_items[0][quantity]=1",
      "metadata[userId]=u-1",
      "allow_promotion_codes=true",
      "success_url=https://x.test/ok?session_id={CHECKOUT_SESSION_ID}",
    ]);
  });
});

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1_800_000_000;

  it("accepts a correctly signed, fresh payload", () => {
    const header = signStripePayload(payload, secret, now);
    expect(verifyStripeSignature(payload, header, secret, 300, now)).toBe(true);
  });

  it("accepts when any of several v1 signatures matches (secret rotation)", () => {
    const good = signStripePayload(payload, secret, now).split(",")[1];
    const header = `t=${now},v1=${"0".repeat(64)},${good}`;
    expect(verifyStripeSignature(payload, header, secret, 300, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const header = signStripePayload(payload, secret, now);
    expect(verifyStripeSignature(`${payload} `, header, secret, 300, now)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const header = signStripePayload(payload, "whsec_other", now);
    expect(verifyStripeSignature(payload, header, secret, 300, now)).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const header = signStripePayload(payload, secret, now - 301);
    expect(verifyStripeSignature(payload, header, secret, 300, now)).toBe(false);
  });

  it("rejects missing / malformed headers", () => {
    expect(verifyStripeSignature(payload, null, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, "", secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, "garbage", secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${now}`, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, "v1=abc", secret, 300, now)).toBe(false);
  });
});

describe("subscriptionPeriodEnd", () => {
  const base = { id: "sub_1", status: "active" as const, customer: "cus_1", metadata: {} };

  it("reads the legacy top-level field", () => {
    const d = subscriptionPeriodEnd({
      ...base,
      cancel_at_period_end: false,
      current_period_end: 1_800_000_000,
    });
    expect(d?.toISOString()).toBe(new Date(1_800_000_000_000).toISOString());
  });

  it("reads the per-item field used by newer API versions", () => {
    const d = subscriptionPeriodEnd({
      ...base,
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1_800_000_000 }] },
    });
    expect(d?.getTime()).toBe(1_800_000_000_000);
  });

  it("returns null when absent", () => {
    expect(subscriptionPeriodEnd({ ...base, cancel_at_period_end: false })).toBeNull();
  });
});
