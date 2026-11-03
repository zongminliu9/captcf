import "server-only";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { logger } from "@/lib/logger";
import { like, sql } from "drizzle-orm";
import { PLANS, type PlanId } from "./plans";
import { readSetting, seal, unseal, writeSetting } from "./settings";
import {
  StripeError,
  type StripePrice,
  appOrigin,
  stripeMode,
  stripeRequest,
  stripeSecretKey,
} from "./stripe";

/**
 * Zero-config Stripe: from just STRIPE_SECRET_KEY, make sure the owner's Stripe account has
 *  - one "CapTCF Premium" product with a price per plan in PLANS (found by lookup key),
 *  - a webhook endpoint pointing at this site (its signing secret is stored encrypted),
 *  - a Customer Portal configuration (card update, invoices, cancel at period end, switch plan).
 * Idempotent and self-healing: it reuses what exists, recreates what was deleted or disabled, and
 * re-checks every few hours. Test and live keys are provisioned separately.
 */

export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "charge.refunded",
] as const;

export interface StripeSetup {
  mode: "live" | "test";
  accountId: string;
  productId: string;
  prices: Record<PlanId, StripePrice>;
  portalConfigId: string | null;
  webhookEndpointId: string | null;
}

interface Stored {
  productId: string;
  portalConfigId: string | null;
  portalFor: string | null;
  webhook: { id: string; url: string; secret: string } | null;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  status: string;
  enabled_events: string[];
  secret?: string;
}

const LOCK_KEY = 7_203_115; // advisory lock: one provisioning run at a time across instances
const RECHECK_MS = 6 * 60 * 60 * 1000;
let memo: { secretKey: string; at: number; promise: Promise<StripeSetup> } | null = null;

/** The provisioned Stripe setup for the configured key, or null when payments are off. */
export function getStripeSetup(): Promise<StripeSetup | null> {
  const secretKey = stripeSecretKey();
  if (!secretKey) return Promise.resolve(null);
  if (memo && memo.secretKey === secretKey && Date.now() - memo.at < RECHECK_MS) {
    return memo.promise;
  }
  const promise = provision(secretKey).catch((e) => {
    memo = null; // retry on the next request instead of caching the failure
    throw e;
  });
  memo = { secretKey, at: Date.now(), promise };
  return promise;
}

/** Test hook: forget the cached setup. */
export function resetStripeSetupCache(): void {
  memo = null;
}

/** Webhook signing secrets for the current key's mode (env override first, for `stripe listen`). */
export async function webhookSigningSecrets(): Promise<string[]> {
  const secretKey = stripeSecretKey();
  if (!secretKey) return [];
  const out: string[] = [];
  if (process.env.STRIPE_WEBHOOK_SECRET) out.push(process.env.STRIPE_WEBHOOK_SECRET);
  const rows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(like(appSettings.key, `stripe:%:${stripeMode(secretKey)}`));
  for (const r of rows) {
    const s = unseal((r.value as Stored).webhook?.secret);
    if (s) out.push(s);
  }
  return out;
}

async function provision(secretKey: string): Promise<StripeSetup> {
  const mode = stripeMode(secretKey);
  const account = await stripeRequest<{ id: string }>("GET", "/account");
  const settingsKey = `stripe:${account.id}:${mode}`;

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_KEY})`);
    const stored = await readSetting<Stored>(settingsKey, tx);

    // ── product + prices ──
    const found = await stripeRequest<{ data: StripePrice[] }>("GET", "/prices", {
      params: { lookup_keys: PLANS.map((p) => p.lookupKey), active: true, limit: 20 },
    });
    const productOf = (p: StripePrice) =>
      typeof p.product === "string" ? p.product : p.product.id;
    let productId = stored?.productId ?? (found.data[0] ? productOf(found.data[0]) : null);

    const createProduct = async () =>
      (
        await stripeRequest<{ id: string }>("POST", "/products", {
          params: {
            name: "CapTCF Premium",
            description:
              "Entraînement illimité et les 4 examens blancs complets TCF Canada (CapTCF).",
            metadata: { app: "captcf" },
          },
        })
      ).id;

    const prices = {} as Record<PlanId, StripePrice>;
    for (const plan of PLANS) {
      const existing = found.data.find((p) => p.lookup_key === plan.lookupKey && p.active);
      if (existing) {
        prices[plan.id] = existing;
        continue;
      }
      productId ??= await createProduct();
      const create = (product: string) =>
        stripeRequest<StripePrice>("POST", "/prices", {
          params: {
            product,
            currency: plan.currency,
            unit_amount: plan.unitAmount,
            recurring: { interval: plan.interval, interval_count: plan.intervalCount },
            lookup_key: plan.lookupKey,
            transfer_lookup_key: true,
            nickname: plan.nickname,
          },
        });
      try {
        prices[plan.id] = await create(productId);
      } catch (e) {
        // The stored product was deleted in the Dashboard → start a fresh one.
        if (!(e instanceof StripeError) || e.code !== "resource_missing") throw e;
        productId = await createProduct();
        prices[plan.id] = await create(productId);
      }
      logger.info("billing: created Stripe price", { plan: plan.id, price: prices[plan.id].id });
    }
    if (!productId) productId = productOf(prices[PLANS[0]!.id]);

    // ── webhook endpoint (needs a public https URL) ──
    const origin = appOrigin();
    const url = `${origin}/api/billing/webhook`;
    let webhook = stored?.webhook ?? null;
    if (origin.startsWith("https://")) {
      let healthy = false;
      if (webhook?.url === url && unseal(webhook.secret)) {
        try {
          const ep = await stripeRequest<WebhookEndpoint>(
            "GET",
            `/webhook_endpoints/${webhook.id}`,
          );
          healthy =
            ep.url === url &&
            ep.status === "enabled" &&
            WEBHOOK_EVENTS.every((ev) => ep.enabled_events.includes(ev));
        } catch (e) {
          if (!(e instanceof StripeError) || e.status !== 404) throw e;
        }
      }
      if (!healthy) {
        // Endpoints for this URL whose secret we don't hold can't be verified — replace them.
        const list = await stripeRequest<{ data: WebhookEndpoint[] }>("GET", "/webhook_endpoints", {
          params: { limit: 100 },
        });
        for (const ep of list.data.filter((ep) => ep.url === url)) {
          await stripeRequest("DELETE", `/webhook_endpoints/${ep.id}`);
        }
        const ep = await stripeRequest<WebhookEndpoint>("POST", "/webhook_endpoints", {
          params: {
            url,
            enabled_events: [...WEBHOOK_EVENTS],
            description: "CapTCF — created automatically by the app",
          },
        });
        if (!ep.secret) throw new Error("Stripe did not return a webhook signing secret");
        webhook = { id: ep.id, url, secret: seal(ep.secret) };
        logger.info("billing: created Stripe webhook endpoint", { endpoint: ep.id, url });
      }
    } else {
      webhook = null;
      logger.warn("billing: not an https origin — webhook endpoint not created", { origin });
    }

    // ── customer portal configuration ──
    const portalFor = `${PLANS.map((p) => prices[p.id].id).join(",")}|${origin}`;
    let portalConfigId = stored?.portalFor === portalFor ? (stored.portalConfigId ?? null) : null;
    if (!portalConfigId) {
      try {
        const https = origin.startsWith("https://");
        const cfg = await stripeRequest<{ id: string }>("POST", "/billing_portal/configurations", {
          params: {
            business_profile: {
              headline: "CapTCF — gérer votre abonnement Premium",
              privacy_policy_url: https ? `${origin}/privacy` : undefined,
              terms_of_service_url: https ? `${origin}/terms` : undefined,
            },
            default_return_url: https ? `${origin}/settings` : undefined,
            features: {
              payment_method_update: { enabled: true },
              invoice_history: { enabled: true },
              customer_update: { enabled: false },
              subscription_cancel: { enabled: true, mode: "at_period_end" },
              subscription_update: {
                enabled: true,
                default_allowed_updates: ["price"],
                proration_behavior: "create_prorations",
                products: [{ product: productId, prices: PLANS.map((p) => prices[p.id].id) }],
              },
            },
          },
        });
        portalConfigId = cfg.id;
      } catch (e) {
        // Not fatal: checkout still works; the portal falls back to the account default.
        logger.error("billing: portal configuration failed", { error: (e as Error).message });
      }
    }

    await writeSetting(
      settingsKey,
      { productId, portalConfigId, portalFor: portalConfigId ? portalFor : null, webhook },
      tx,
    );
    return {
      mode,
      accountId: account.id,
      productId,
      prices,
      portalConfigId,
      webhookEndpointId: webhook?.id ?? null,
    };
  });
}
