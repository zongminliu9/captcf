import "server-only";
import { db } from "@/db";
import { entitlements, subscriptions, users } from "@/db/schema";
import { logger } from "@/lib/logger";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { isPremiumSubscriptionStatus, passDays, passExpiry } from "./rules";
import {
  type StripeCheckoutSession,
  type StripeSubscription,
  findCheckoutSessionByPaymentIntent,
  getSubscription,
  subscriptionPeriodEnd,
} from "./stripe";

/**
 * Turning Stripe state into CapTCF access. Every function here is idempotent: the same payment
 * may arrive via the webhook AND the success redirect (in any order, possibly concurrently), and
 * Stripe retries webhooks, so applying an event twice must be a no-op.
 */

export type FulfillResult = "premium" | "pending" | "unknown_user" | "ignored";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The id if it names an existing user, else null (deleted accounts, junk metadata). */
async function existingUser(userId: string | null | undefined): Promise<string | null> {
  if (!userId || !UUID.test(userId)) return null;
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.id ?? null;
}

/** Apply a completed Checkout Session (subscription or one-time pass). */
export async function fulfillCheckoutSession(
  session: StripeCheckoutSession,
): Promise<FulfillResult> {
  if (session.status !== "complete") return "pending";
  // Async methods (some bank debits) complete before the money arrives; wait for
  // `checkout.session.async_payment_succeeded` in that case.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return "pending";
  }

  const userId = await existingUser(session.client_reference_id ?? session.metadata?.userId);
  if (!userId) {
    logger.warn("billing: checkout session for unknown user", { session: session.id });
    return "unknown_user";
  }

  if (session.mode === "subscription" && session.subscription) {
    const sub = await getSubscription(session.subscription);
    await syncSubscription(sub, userId);
    return isPremiumSubscriptionStatus(sub.status) ? "premium" : "pending";
  }

  if (session.mode === "payment") {
    await grantPass(userId, session);
    return "premium";
  }

  return "ignored";
}

/** One-time pass: an expiring entitlement keyed by the Checkout Session id (never granted twice). */
async function grantPass(userId: string, session: StripeCheckoutSession): Promise<void> {
  const already = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(eq(entitlements.providerRef, session.id))
    .limit(1);
  if (already[0]) return;

  const now = new Date();
  const running = await db
    .select({ expiresAt: entitlements.expiresAt })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.source, "stripe"),
        gt(entitlements.expiresAt, now),
      ),
    )
    .orderBy(desc(entitlements.expiresAt))
    .limit(1);

  const days = passDays({ access_days: session.metadata?.accessDays ?? "" });
  await db
    .insert(entitlements)
    .values({
      userId,
      plan: "premium",
      source: "stripe",
      providerRef: session.id,
      expiresAt: passExpiry(now, running[0]?.expiresAt ?? null, days),
    })
    .onConflictDoNothing({ target: entitlements.providerRef });
}

/**
 * Mirror a Stripe subscription into `subscriptions` (one row per user). Callers should pass a
 * freshly retrieved subscription so out-of-order webhook deliveries can't regress the state.
 */
export async function syncSubscription(
  sub: StripeSubscription,
  userIdHint?: string | null,
): Promise<FulfillResult> {
  const userId = userIdHint ?? sub.metadata?.userId ?? null;
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      userId && UUID.test(userId)
        ? eq(subscriptions.userId, userId)
        : or(
            eq(subscriptions.providerSubscriptionId, sub.id),
            eq(subscriptions.providerCustomerId, sub.customer),
          ),
    )
    .limit(1);
  const resolvedUserId = await existingUser(userId ?? existing?.userId);
  if (!resolvedUserId) {
    logger.warn("billing: subscription for unknown user", { subscription: sub.id });
    return "unknown_user";
  }

  const premium = isPremiumSubscriptionStatus(sub.status);
  // A late event about an OLD subscription must not overwrite a newer live one.
  if (
    existing?.provider === "stripe" &&
    existing.providerSubscriptionId &&
    existing.providerSubscriptionId !== sub.id &&
    !premium &&
    isPremiumSubscriptionStatus(existing.status)
  ) {
    return "ignored";
  }

  const values = {
    plan: premium ? ("premium" as const) : ("free" as const),
    status: sub.status,
    provider: "stripe",
    providerCustomerId: sub.customer,
    providerSubscriptionId: sub.id,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values({ userId: resolvedUserId, ...values })
    .onConflictDoUpdate({ target: subscriptions.userId, set: values });
  return premium ? "premium" : "ignored";
}

/** Re-fetch then sync (used for every `customer.subscription.*` webhook). */
export async function refreshSubscription(subscriptionId: string): Promise<FulfillResult> {
  return syncSubscription(await getSubscription(subscriptionId));
}

/** A fully refunded one-time pass stops granting access. Subscriptions end via their own events. */
export async function revokeRefundedCharge(charge: {
  refunded?: boolean;
  payment_intent?: string | null;
}): Promise<FulfillResult> {
  if (!charge.refunded || !charge.payment_intent) return "ignored";
  const session = await findCheckoutSessionByPaymentIntent(charge.payment_intent);
  if (!session || session.mode !== "payment") return "ignored";
  await db
    .update(entitlements)
    .set({ expiresAt: new Date() })
    .where(
      and(
        eq(entitlements.providerRef, session.id),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, new Date())),
      ),
    );
  return "ignored";
}

/** Current billing snapshot for the settings page. */
export async function billingSnapshot(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  const [pass] = await db
    .select({ expiresAt: entitlements.expiresAt })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.source, "stripe"),
        gt(entitlements.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(entitlements.expiresAt))
    .limit(1);
  return { subscription: sub ?? null, passExpiresAt: pass?.expiresAt ?? null };
}
