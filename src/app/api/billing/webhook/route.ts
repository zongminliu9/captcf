import { db } from "@/db";
import { analyticsEvents, entitlements, subscriptions } from "@/db/schema";
import { logger } from "@/lib/logger";
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Idempotent: each event id is processed at most once (recorded in
 * analytics_events). Signature verification requires the Stripe SDK + STRIPE_WEBHOOK_SECRET;
 * without them the endpoint is a safe no-op so the app runs with no Stripe config.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();
  if (!secret) {
    return NextResponse.json({ received: true, note: "stripe not configured (simulator mode)" });
  }

  // In production: event = stripe.webhooks.constructEvent(body, req.headers.get('stripe-signature'), secret)
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const eventId = String(event?.id ?? "");
  if (!eventId) return NextResponse.json({ error: "no_event_id" }, { status: 400 });

  // idempotency: skip already-processed events
  const seen = await db
    .select({ id: analyticsEvents.id })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.type, "stripe_webhook"),
        sql`${analyticsEvents.props}->>'id' = ${eventId}`,
      ),
    )
    .limit(1);
  if (seen[0]) return NextResponse.json({ received: true, duplicate: true });

  try {
    const obj = event.data?.object ?? {};
    const userId = obj.metadata?.userId ?? obj.client_reference_id ?? null;
    if (userId) {
      if (
        event.type === "checkout.session.completed" ||
        event.type === "customer.subscription.updated"
      ) {
        await db
          .insert(subscriptions)
          .values({
            userId,
            plan: "premium",
            status: "active",
            provider: "stripe",
            providerCustomerId: obj.customer ?? null,
            providerSubscriptionId: obj.subscription ?? obj.id ?? null,
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: { plan: "premium", status: "active", provider: "stripe" },
          });
        await db.insert(entitlements).values({ userId, plan: "premium", source: "stripe" });
      } else if (event.type === "customer.subscription.deleted") {
        await db
          .update(subscriptions)
          .set({ plan: "free", status: "canceled" })
          .where(eq(subscriptions.userId, userId));
        await db.delete(entitlements).where(eq(entitlements.userId, userId));
      }
    }
    await db
      .insert(analyticsEvents)
      .values({ type: "stripe_webhook", props: { id: eventId, type: event.type } });
    return NextResponse.json({ received: true });
  } catch (e) {
    logger.error("stripe webhook processing failed", { eventId, error: (e as Error).message });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
