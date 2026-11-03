/**
 * Zero-config Stripe: with only STRIPE_SECRET_KEY, the app creates the product, the two plan
 * prices, the webhook endpoint (storing its signing secret) and the portal configuration — then
 * accepts webhooks signed with that stored secret. Stripe's API is an in-memory fake on `fetch`.
 */
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { PLANS } from "@/lib/billing/plans";
import {
  WEBHOOK_EVENTS,
  getStripeSetup,
  resetStripeSetupCache,
  webhookSigningSecrets,
} from "@/lib/billing/provision";
import { signStripePayload } from "@/lib/billing/stripe";
import { like } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const ENV: Record<string, string | undefined> = {
  PAYMENTS_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_provision",
  STRIPE_WEBHOOK_SECRET: undefined, // the app must use the secret it provisioned itself
  APP_URL: "https://captcf.example",
};
const saved: Record<string, string | undefined> = {};
const ACCOUNT = "acct_provision_test";

// ── fake Stripe account ──────────────────────────────────────────────────────
type Obj = Record<string, unknown>;
const state = {
  products: [] as Obj[],
  prices: [] as Obj[],
  endpoints: [] as Obj[],
  portalConfigs: [] as Obj[],
  creates: 0,
  n: 0,
};
const realFetch = globalThis.fetch;
const id = (p: string) => `${p}_${++state.n}`;

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  if (url.hostname !== "api.stripe.com") return realFetch(input, init);
  const method = init?.method ?? "GET";
  const form = new URLSearchParams(String(init?.body ?? ""));
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
  const path = url.pathname.replace(/^\/v1/, "");
  if (method === "POST") state.creates++;

  if (method === "GET" && path === "/account") return reply(200, { id: ACCOUNT });
  if (method === "GET" && path === "/prices") {
    const keys = [...url.searchParams]
      .filter(([k]) => k.startsWith("lookup_keys"))
      .map(([, v]) => v);
    return reply(200, {
      data: state.prices.filter((p) => keys.includes(p.lookup_key as string) && p.active),
    });
  }
  if (method === "POST" && path === "/products") {
    const p = { id: id("prod"), name: form.get("name") };
    state.products.push(p);
    return reply(200, p);
  }
  if (method === "POST" && path === "/prices") {
    if (!state.products.some((p) => p.id === form.get("product")))
      return reply(400, { error: { message: "No such product", code: "resource_missing" } });
    const p = {
      id: id("price"),
      active: true,
      product: form.get("product"),
      lookup_key: form.get("lookup_key"),
      currency: form.get("currency"),
      unit_amount: Number(form.get("unit_amount")),
      type: "recurring",
      recurring: {
        interval: form.get("recurring[interval]"),
        interval_count: Number(form.get("recurring[interval_count]")),
      },
      metadata: {},
    };
    state.prices.push(p);
    return reply(200, p);
  }
  const ep = path.match(/^\/webhook_endpoints\/(.+)$/);
  if (ep && method === "GET") {
    const found = state.endpoints.find((e) => e.id === ep[1]);
    return found
      ? reply(200, found)
      : reply(404, { error: { message: "No such webhook endpoint" } });
  }
  if (ep && method === "DELETE") {
    state.endpoints = state.endpoints.filter((e) => e.id !== ep[1]);
    return reply(200, { id: ep[1], deleted: true });
  }
  if (path === "/webhook_endpoints" && method === "GET")
    return reply(200, { data: state.endpoints });
  if (path === "/webhook_endpoints" && method === "POST") {
    const e = {
      id: id("we"),
      url: form.get("url"),
      status: "enabled",
      enabled_events: [...form].filter(([k]) => k.startsWith("enabled_events")).map(([, v]) => v),
      secret: `whsec_${Math.random().toString(36).slice(2)}`,
    };
    state.endpoints.push(e);
    return reply(200, e);
  }
  if (path === "/billing_portal/configurations" && method === "POST") {
    const c = { id: id("bpc"), params: Object.fromEntries(form) };
    state.portalConfigs.push(c);
    return reply(200, c);
  }
  return reply(404, { error: { message: `unexpected ${method} ${path}` } });
}

async function sendSigned(secret: string) {
  const body = JSON.stringify({
    id: `evt_prov_${Date.now()}`,
    type: "ping.unhandled",
    data: { object: {} },
  });
  return webhook(
    new NextRequest("https://captcf.example/api/billing/webhook", {
      method: "POST",
      body,
      headers: {
        "stripe-signature": signStripePayload(body, secret, Math.floor(Date.now() / 1000)),
      },
    }),
  );
}

beforeAll(async () => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  await db.delete(appSettings).where(like(appSettings.key, `stripe:${ACCOUNT}:%`));
});

beforeEach(() => resetStripeSetupCache());

afterAll(async () => {
  vi.unstubAllGlobals();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await db.delete(appSettings).where(like(appSettings.key, `stripe:${ACCOUNT}:%`));
  resetStripeSetupCache();
});

describe("zero-config Stripe provisioning", () => {
  it("creates the product, both plan prices, the webhook and the portal from one key", async () => {
    const setup = await getStripeSetup();
    expect(setup?.mode).toBe("test");
    expect(state.products).toHaveLength(1);
    expect(state.prices).toHaveLength(2);

    for (const plan of PLANS) {
      const price = setup!.prices[plan.id];
      expect(price).toMatchObject({
        lookup_key: plan.lookupKey,
        unit_amount: plan.unitAmount,
        currency: "usd",
        product: state.products[0]!.id,
        recurring: { interval: "month", interval_count: plan.intervalCount },
      });
    }

    expect(state.endpoints).toHaveLength(1);
    expect(state.endpoints[0]).toMatchObject({ url: "https://captcf.example/api/billing/webhook" });
    expect(state.endpoints[0]!.enabled_events).toEqual([...WEBHOOK_EVENTS]);

    expect(state.portalConfigs).toHaveLength(1);
    const portal = state.portalConfigs[0]!.params as Record<string, string>;
    expect(portal["features[subscription_cancel][mode]"]).toBe("at_period_end");
    expect(portal["features[subscription_update][products][0][product]"]).toBe(
      state.products[0]!.id,
    );

    // the stored secret is encrypted at rest…
    const [row] = await db
      .select()
      .from(appSettings)
      .where(like(appSettings.key, `stripe:${ACCOUNT}:test`));
    expect(JSON.stringify(row?.value)).not.toContain(state.endpoints[0]!.secret as string);
    // …and is what the webhook route now verifies against
    expect(await webhookSigningSecrets()).toEqual([state.endpoints[0]!.secret]);
    expect((await sendSigned(state.endpoints[0]!.secret as string)).status).toBe(200);
    expect((await sendSigned("whsec_attacker")).status).toBe(400);
  });

  it("is idempotent: a second run (e.g. a new server process) creates nothing", async () => {
    const before = state.creates;
    const setup = await getStripeSetup();
    expect(state.creates).toBe(before);
    expect(state.products).toHaveLength(1);
    expect(state.prices).toHaveLength(2);
    expect(state.endpoints).toHaveLength(1);
    expect(setup?.webhookEndpointId).toBe(state.endpoints[0]!.id);
  });

  it("self-heals when the webhook endpoint was deleted or disabled in the Dashboard", async () => {
    const oldSecret = state.endpoints[0]!.secret;
    state.endpoints[0]!.status = "disabled";
    await getStripeSetup();
    expect(state.endpoints).toHaveLength(1); // replaced, not duplicated
    expect(state.endpoints[0]!.status).toBe("enabled");
    expect(state.endpoints[0]!.secret).not.toBe(oldSecret);
    expect(await webhookSigningSecrets()).toEqual([state.endpoints[0]!.secret]);

    resetStripeSetupCache();
    state.endpoints = [];
    await getStripeSetup();
    expect(state.endpoints).toHaveLength(1);
  });

  it("recreates the product if it was deleted", async () => {
    // simulate: prices archived + product gone → stored product id is stale
    for (const p of state.prices) p.active = false;
    state.products = [];
    await getStripeSetup();
    expect(state.products).toHaveLength(1);
    expect(state.prices.filter((p) => p.active)).toHaveLength(2);
  });
});
