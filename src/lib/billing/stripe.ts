import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe client over the REST API (no SDK dependency).
 *
 * Only the handful of calls CapTCF needs: Checkout Sessions, Prices, Subscriptions, Billing
 * Portal, plus webhook signature verification. Everything is plain `fetch` so it runs anywhere
 * Next.js runs and adds nothing to the lockfile.
 */

/** Overridable only so the full flow can be smoke-tested against a local fake Stripe. */
const apiBase = () => process.env.STRIPE_API_BASE ?? "https://api.stripe.com/v1";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  priceId: string;
}

/**
 * Real payments are live only when the provider is `stripe` AND the secret key, webhook secret
 * and price are all set. A half-configured deploy keeps checkout hidden (instead of taking money
 * it could not fulfil or keep in sync).
 */
export function getStripeConfig(): StripeConfig | null {
  if (process.env.PAYMENTS_PROVIDER !== "stripe") return null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_PREMIUM;
  if (!secretKey || !webhookSecret || !priceId) return null;
  return { secretKey, webhookSecret, priceId };
}

export function paymentsEnabled(): boolean {
  return getStripeConfig() !== null;
}

/** Public origin for absolute URLs Stripe redirects back to. */
export function appOrigin(): string {
  const url = process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

// ── form encoding ────────────────────────────────────────────────────────────

export type FormValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FormValue[]
  | { [key: string]: FormValue };

/** Encode nested params the way Stripe expects: `a[b][0][c]=v`. Null/undefined are skipped. */
export function encodeForm(params: Record<string, FormValue>): string {
  const out: string[] = [];
  const walk = (prefix: string, value: FormValue) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(`${prefix}[${k}]`, v);
    } else {
      out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const [k, v] of Object.entries(params)) walk(k, v);
  return out.join("&");
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "StripeError";
  }
}

interface RequestOptions {
  params?: Record<string, FormValue>;
  idempotencyKey?: string;
}

export async function stripeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("STRIPE_SECRET_KEY is not set", 500);

  const query = opts.params ? encodeForm(opts.params) : "";
  const base = apiBase();
  const url = method === "POST" || !query ? `${base}${path}` : `${base}${path}?${query}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? query : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  };
  if (!res.ok) {
    throw new StripeError(
      json.error?.message ?? `Stripe ${method} ${path} failed`,
      res.status,
      json.error?.code,
    );
  }
  return json as T;
}

// ── objects (only the fields we read) ────────────────────────────────────────

export interface StripePrice {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  type: "one_time" | "recurring";
  recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
  metadata: Record<string, string>;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  mode: "payment" | "subscription" | "setup";
  status: "open" | "complete" | "expired" | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
  customer: string | null;
  subscription: string | null;
  payment_intent: string | null;
}

export interface StripeSubscription {
  id: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  customer: string;
  metadata: Record<string, string>;
  cancel_at_period_end: boolean;
  /** Pre-2025 API versions expose the period on the subscription… */
  current_period_end?: number;
  /** …newer ones on each subscription item. We read either. */
  items?: { data: { current_period_end?: number }[] };
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export function subscriptionPeriodEnd(sub: StripeSubscription): Date | null {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

export const getPrice = (id: string) =>
  stripeRequest<StripePrice>("GET", `/prices/${encodeURIComponent(id)}`);

export const getCheckoutSession = (id: string) =>
  stripeRequest<StripeCheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);

export const getSubscription = (id: string) =>
  stripeRequest<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);

export const cancelSubscriptionNow = (id: string) =>
  stripeRequest<StripeSubscription>("DELETE", `/subscriptions/${encodeURIComponent(id)}`);

export async function findCheckoutSessionByPaymentIntent(
  paymentIntentId: string,
): Promise<StripeCheckoutSession | null> {
  const list = await stripeRequest<{ data: StripeCheckoutSession[] }>("GET", "/checkout/sessions", {
    params: { payment_intent: paymentIntentId, limit: 1 },
  });
  return list.data[0] ?? null;
}

export async function createPortalSession(customer: string, returnUrl: string): Promise<string> {
  const s = await stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", {
    params: { customer, return_url: returnUrl },
  });
  return s.url;
}

// ── webhook signatures ───────────────────────────────────────────────────────

/**
 * Verify a `Stripe-Signature` header (`t=<ts>,v1=<hex>[,v1=…]`): HMAC-SHA256 of `${t}.${body}`
 * keyed with the endpoint secret, constant-time compared, and the timestamp must be within
 * `toleranceSec` (replay protection). Returns false on any mismatch — never throws.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2).map((x) => x?.trim());
    if (!k || !v) continue;
    if (k === "t") timestamp = Number(v);
    else if (k === "v1") signatures.push(v);
  }
  if (timestamp === null || !Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"),
    "utf8",
  );
  return signatures.some((sig) => {
    const given = Buffer.from(sig, "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Test helper / reference implementation of the header Stripe sends. */
export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
