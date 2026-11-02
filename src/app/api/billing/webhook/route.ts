import { db } from "@/db";
import { billingEvents } from "@/db/schema";
import {
  type FulfillResult,
  fulfillCheckoutSession,
  refreshSubscription,
  revokeRefundedCharge,
} from "@/lib/billing/fulfill";
import {
  type StripeCheckoutSession,
  type StripeEvent,
  getStripeConfig,
  verifyStripeSignature,
} from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook.
 * - Every request must carry a valid `Stripe-Signature` for STRIPE_WEBHOOK_SECRET; anything else
 *   is rejected (no one can forge a "payment succeeded" event).
 * - Idempotent: processed event ids are recorded in `billing_events`, and every handler is itself
 *   idempotent, so Stripe's retries and the success-redirect race are harmless.
 * - Subscription events re-fetch the subscription from Stripe, so out-of-order delivery can't
 *   regress a learner's access.
 *
 * Subscribe the endpoint to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * customer.subscription.created, customer.subscription.updated, customer.subscription.deleted,
 * charge.refunded.
 */
export async function POST(req: NextRequest) {
  const cfg = getStripeConfig();
  const body = await req.text();
  if (!cfg) {
    return NextResponse.json({ received: true, note: "stripe not configured" });
  }

  if (!verifyStripeSignature(body, req.headers.get("stripe-signature"), cfg.webhookSecret)) {
    logger.warn("billing: webhook signature verification failed");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const seen = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.id, event.id))
    .limit(1);
  if (seen[0]) return NextResponse.json({ received: true, duplicate: true });

  let result: FulfillResult = "ignored";
  try {
    const obj = event.data?.object ?? {};
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        result = await fulfillCheckoutSession(obj as unknown as StripeCheckoutSession);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        result = await refreshSubscription(String(obj.id));
        break;
      case "charge.refunded":
        result = await revokeRefundedCharge(
          obj as { refunded?: boolean; payment_intent?: string | null },
        );
        break;
      default:
        break; // not an event we act on — acknowledge so Stripe stops retrying
    }
  } catch (e) {
    // 500 → Stripe retries with backoff; nothing was marked processed.
    logger.error("billing: webhook processing failed", {
      eventId: event.id,
      type: event.type,
      error: (e as Error).message,
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  await db
    .insert(billingEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing({ target: billingEvents.id });
  logger.info("billing: webhook processed", { eventId: event.id, type: event.type, result });
  return NextResponse.json({ received: true });
}
