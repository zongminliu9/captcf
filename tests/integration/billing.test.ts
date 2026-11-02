/**
 * Real-payments path, end to end against Postgres: the actual webhook route handler is invoked
 * with Stripe-signed payloads, and Stripe's REST API is replaced by an in-memory fake on `fetch`.
 */
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { db } from "@/db";
import { billingEvents, entitlements, subscriptions, users } from "@/db/schema";
import type { Actor } from "@/lib/auth/owner";
import { fulfillCheckoutSession } from "@/lib/billing/fulfill";
import { type StripeCheckoutSession, signStripePayload } from "@/lib/billing/stripe";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_integration_test";
const ENV = {
  PAYMENTS_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_integration",
  STRIPE_WEBHOOK_SECRET: SECRET,
  STRIPE_PRICE_PREMIUM: "price_test",
};
const saved: Record<string, string | undefined> = {};

// ── fake Stripe API ──────────────────────────────────────────────────────────
const fakeSubs = new Map<string, Record<string, unknown>>();
const fakeSessionsByPI = new Map<string, Record<string, unknown>>();
const realFetch = globalThis.fetch;

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  if (url.hostname !== "api.stripe.com") return realFetch(input, init);
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    `Bearer ${ENV.STRIPE_SECRET_KEY}`,
  );
  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
  const sub = url.pathname.match(/^\/v1\/subscriptions\/(.+)$/);
  if (sub) {
    const found = fakeSubs.get(decodeURIComponent(sub[1]!));
    return found ? json(200, found) : json(404, { error: { message: "No such subscription" } });
  }
  if (url.pathname === "/v1/checkout/sessions") {
    const s = fakeSessionsByPI.get(url.searchParams.get("payment_intent") ?? "");
    return json(200, { data: s ? [s] : [] });
  }
  return json(404, { error: { message: `unexpected ${url.pathname}` } });
}

// ── helpers ──────────────────────────────────────────────────────────────────
const createdUsers: string[] = [];
const createdEvents: string[] = [];
let n = 0;

async function newUser(): Promise<Actor & { kind: "user" }> {
  const [u] = await db
    .insert(users)
    .values({ email: `bill_${Date.now()}_${n++}@captcf.test`, passwordHash: "x" })
    .returning({ id: users.id });
  createdUsers.push(u!.id);
  return { kind: "user", userId: u!.id, role: "user", email: "bill@test", name: null };
}

function eventId(): string {
  const id = `evt_it_${Date.now()}_${n++}`;
  createdEvents.push(id);
  return id;
}

async function send(
  type: string,
  object: Record<string, unknown>,
  opts: { id?: string; sign?: boolean } = {},
) {
  const id = opts.id ?? eventId();
  const body = JSON.stringify({ id, type, data: { object } });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.sign !== false)
    headers["stripe-signature"] = signStripePayload(body, SECRET, Math.floor(Date.now() / 1000));
  const res = await webhook(
    new NextRequest("http://localhost/api/billing/webhook", { method: "POST", body, headers }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown>, id };
}

function paidSession(
  userId: string,
  over: Partial<StripeCheckoutSession> = {},
): StripeCheckoutSession {
  return {
    id: `cs_test_${Date.now()}_${n++}`,
    url: null,
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    client_reference_id: userId,
    metadata: { userId, accessDays: "30" },
    customer: "cus_test",
    subscription: null,
    payment_intent: `pi_test_${n++}`,
    ...over,
  };
}

async function stripeEntitlements(userId: string) {
  return db.select().from(entitlements).where(eq(entitlements.userId, userId));
}

beforeAll(() => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  fakeSubs.clear();
  fakeSessionsByPI.clear();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  if (createdEvents.length)
    await db.delete(billingEvents).where(inArray(billingEvents.id, createdEvents));
  if (createdUsers.length) await db.delete(users).where(inArray(users.id, createdUsers)); // cascades
});

// ── tests ────────────────────────────────────────────────────────────────────
describe("stripe webhook security", () => {
  it("rejects an unsigned or forged 'payment succeeded' event and grants nothing", async () => {
    const user = await newUser();
    const session = paidSession(user.userId);

    const unsigned = await send("checkout.session.completed", { ...session }, { sign: false });
    expect(unsigned.status).toBe(400);

    const body = JSON.stringify({
      id: eventId(),
      type: "checkout.session.completed",
      data: { object: session },
    });
    const forged = await webhook(
      new NextRequest("http://localhost/api/billing/webhook", {
        method: "POST",
        body,
        headers: {
          "stripe-signature": signStripePayload(
            body,
            "whsec_attacker",
            Math.floor(Date.now() / 1000),
          ),
        },
      }),
    );
    expect(forged.status).toBe(400);

    expect(await getPlanForActor(user)).toBe("free");
    expect(await stripeEntitlements(user.userId)).toHaveLength(0);
  });
});

describe("one-time pass", () => {
  it("grants an expiring pass once, even with webhook retries and the success-redirect race", async () => {
    const user = await newUser();
    const session = paidSession(user.userId);

    const first = await send("checkout.session.completed", { ...session });
    expect(first.status).toBe(200);
    // Stripe retry of the same event → acknowledged as duplicate
    const retry = await send("checkout.session.completed", { ...session }, { id: first.id });
    expect(retry.json.duplicate).toBe(true);
    // success redirect fulfilling the same session concurrently/afterwards → no second grant
    expect(await fulfillCheckoutSession(session)).toBe("premium");

    const rows = await stripeEntitlements(user.userId);
    expect(rows).toHaveLength(1);
    const days = (rows[0]!.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
    expect(await getPlanForActor(user)).toBe("premium");
  });

  it("stacks a second pass on top of the running one", async () => {
    const user = await newUser();
    await send("checkout.session.completed", { ...paidSession(user.userId) });
    await send("checkout.session.completed", { ...paidSession(user.userId) });
    const rows = await stripeEntitlements(user.userId);
    expect(rows).toHaveLength(2);
    const latest = Math.max(...rows.map((r) => r.expiresAt!.getTime()));
    expect((latest - Date.now()) / 86_400_000).toBeGreaterThan(59.9);
  });

  it("does not grant while an async payment is still processing", async () => {
    const user = await newUser();
    const session = paidSession(user.userId, { payment_status: "unpaid" });
    await send("checkout.session.completed", { ...session });
    expect(await getPlanForActor(user)).toBe("free");
    // …then grants when Stripe confirms the funds
    await send("checkout.session.async_payment_succeeded", { ...session, payment_status: "paid" });
    expect(await getPlanForActor(user)).toBe("premium");
  });

  it("a full refund ends the pass", async () => {
    const user = await newUser();
    const session = paidSession(user.userId);
    await send("checkout.session.completed", { ...session });
    expect(await getPlanForActor(user)).toBe("premium");

    fakeSessionsByPI.set(session.payment_intent!, { ...session });
    await send("charge.refunded", {
      id: "ch_1",
      refunded: true,
      payment_intent: session.payment_intent,
    });
    expect(await getPlanForActor(user)).toBe("free");
  });

  it("ignores sessions for users that no longer exist (and does not make Stripe retry)", async () => {
    const res = await send("checkout.session.completed", {
      ...paidSession("00000000-0000-4000-8000-000000000000"),
    });
    expect(res.status).toBe(200);
  });
});

describe("subscription", () => {
  function sub(id: string, userId: string, status: string) {
    return {
      id,
      status,
      customer: `cus_${userId.slice(0, 8)}`,
      metadata: { userId },
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
    };
  }

  it("activates on checkout, survives past_due retries, and ends on cancellation", async () => {
    const user = await newUser();
    const subId = `sub_${n++}`;
    fakeSubs.set(subId, sub(subId, user.userId, "active"));

    await send("checkout.session.completed", {
      ...paidSession(user.userId, {
        mode: "subscription",
        subscription: subId,
        payment_intent: null,
      }),
    });
    expect(await getPlanForActor(user)).toBe("premium");
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.userId));
    expect(row?.provider).toBe("stripe");
    expect(row?.providerSubscriptionId).toBe(subId);
    expect(row?.currentPeriodEnd).toBeInstanceOf(Date);

    // renewal failed → Stripe retries; access kept
    fakeSubs.set(subId, sub(subId, user.userId, "past_due"));
    await send("customer.subscription.updated", { id: subId });
    expect(await getPlanForActor(user)).toBe("premium");

    // retries exhausted / user cancelled → access ends. The handler re-fetches from Stripe, so
    // even a stale payload claiming "active" can't keep access.
    fakeSubs.set(subId, sub(subId, user.userId, "canceled"));
    await send("customer.subscription.deleted", { id: subId, status: "active" });
    expect(await getPlanForActor(user)).toBe("free");
  });

  it("a late event about an old subscription does not cancel the new one", async () => {
    const user = await newUser();
    const oldId = `sub_old_${n++}`;
    const newId = `sub_new_${n++}`;
    fakeSubs.set(newId, sub(newId, user.userId, "active"));
    await send("customer.subscription.created", { id: newId });
    expect(await getPlanForActor(user)).toBe("premium");

    fakeSubs.set(oldId, sub(oldId, user.userId, "canceled"));
    await send("customer.subscription.deleted", { id: oldId });
    expect(await getPlanForActor(user)).toBe("premium");
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.userId));
    expect(row?.providerSubscriptionId).toBe(newId);
  });

  it("returns 500 (so Stripe retries) when Stripe can't be reached, without marking the event done", async () => {
    const user = await newUser();
    const res = await send("customer.subscription.updated", { id: "sub_missing" });
    expect(res.status).toBe(500);
    const marked = await db.select().from(billingEvents).where(eq(billingEvents.id, res.id));
    expect(marked).toHaveLength(0);
    expect(await getPlanForActor(user)).toBe("free");
  });
});
