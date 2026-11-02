import { db } from "@/db";
import { entitlements, subscriptions } from "@/db/schema";
import { getActor } from "@/lib/auth/session";
import { getPremiumOffer } from "@/lib/billing/offer";
import { isPremiumSubscriptionStatus } from "@/lib/billing/rules";
import {
  type FormValue,
  type StripeCheckoutSession,
  appOrigin,
  getStripeConfig,
  stripeRequest,
} from "@/lib/billing/stripe";
import { redirectTo } from "@/lib/http";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Checkout.
 * - Stripe (PAYMENTS_PROVIDER=stripe + keys + price): creates a real Stripe Checkout Session and
 *   sends the learner to Stripe's hosted payment page. The price decides the mode: a recurring
 *   price → subscription; a one-time price → a fixed-length pass. Access is granted only once
 *   Stripe confirms payment (success redirect and/or webhook — see lib/billing/fulfill).
 * - Beta / not fully configured: grants NOTHING and returns to /pricing with a notice.
 * - Dev only: the entitlement SIMULATOR grants Premium immediately so it is testable locally.
 * Guests must register first.
 */
async function handle(): Promise<NextResponse> {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") {
    return redirectTo("/register?next=/pricing", 303);
  }

  const provider = process.env.PAYMENTS_PROVIDER ?? "simulator";

  if (provider === "stripe") {
    const cfg = getStripeConfig();
    if (!cfg) return redirectTo("/pricing?beta=1", 303);
    return stripeCheckout(actor.userId, actor.email);
  }

  // Anywhere other than an explicit dev simulator (i.e. the hosted beta), grant nothing.
  if (provider !== "simulator" || process.env.NODE_ENV === "production") {
    return redirectTo("/pricing?beta=1", 303);
  }

  // Dev simulator only: grant Premium immediately (never runs in production).
  await db
    .insert(subscriptions)
    .values({ userId: actor.userId, plan: "premium", status: "active", provider: "simulator" })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { plan: "premium", status: "active" },
    });
  await db
    .insert(entitlements)
    .values({ userId: actor.userId, plan: "premium", source: "simulator" });

  return redirectTo("/dashboard?upgraded=1", 303);
}

async function stripeCheckout(userId: string, email: string): Promise<NextResponse> {
  const limited = await rateLimit(`checkout:${userId}`, 10, 600);
  if (!limited.allowed) return redirectTo("/pricing?checkout=error", 303);

  const offer = await getPremiumOffer();
  if (!offer) return redirectTo("/pricing?checkout=error", 303);

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  const stripeCustomer = sub?.provider === "stripe" ? sub.providerCustomerId : null;

  // Never sell a second recurring subscription on top of a live one — manage it instead.
  if (
    offer.mode === "subscription" &&
    sub?.provider === "stripe" &&
    sub.plan === "premium" &&
    isPremiumSubscriptionStatus(sub.status)
  ) {
    return redirectTo("/settings?billing=already", 303);
  }

  const origin = appOrigin();
  const metadata = { userId, ...(offer.mode === "payment" ? { accessDays: offer.passDays } : {}) };
  const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === "true";

  const params: Record<string, FormValue> = {
    mode: offer.mode,
    line_items: [{ price: offer.price.id, quantity: 1 }],
    client_reference_id: userId,
    metadata,
    success_url: `${origin}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    locale: "auto",
    ...(stripeCustomer ? { customer: stripeCustomer } : { customer_email: email }),
    ...(automaticTax
      ? {
          automatic_tax: { enabled: true },
          billing_address_collection: "required",
          ...(stripeCustomer ? { customer_update: { address: "auto", name: "auto" } } : {}),
        }
      : {}),
    ...(offer.mode === "subscription"
      ? { subscription_data: { metadata: { userId } } }
      : {
          payment_intent_data: { metadata },
          ...(stripeCustomer ? {} : { customer_creation: "always" }),
        }),
  };

  try {
    const session = await stripeRequest<StripeCheckoutSession>("POST", "/checkout/sessions", {
      params,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    // External absolute redirect to Stripe's hosted page.
    return new NextResponse(null, { status: 303, headers: { Location: session.url } });
  } catch (e) {
    logger.error("billing: checkout session creation failed", {
      userId,
      error: (e as Error).message,
    });
    return redirectTo("/pricing?checkout=error", 303);
  }
}

// POST from the pricing form; GET kept so plain links (and the dev E2E) keep working.
export const POST = handle;
export const GET = handle;
