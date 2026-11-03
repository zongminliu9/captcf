import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getActor } from "@/lib/auth/session";
import { getStripeSetup } from "@/lib/billing/provision";
import { appOrigin, createPortalSession, paymentsEnabled } from "@/lib/billing/stripe";
import { redirectTo } from "@/lib/http";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe Customer Portal: the learner updates their card, downloads invoices, or cancels their
 * subscription (it then runs until the end of the paid period; the webhook mirrors the change).
 */
export async function POST() {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") return redirectTo("/login?next=/settings", 303);
  if (!paymentsEnabled()) return redirectTo("/settings", 303);

  const [sub] = await db
    .select({ provider: subscriptions.provider, customer: subscriptions.providerCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, actor.userId))
    .limit(1);
  if (sub?.provider !== "stripe" || !sub.customer) return redirectTo("/settings", 303);

  try {
    const setup = await getStripeSetup();
    const url = await createPortalSession(
      sub.customer,
      `${appOrigin()}/settings`,
      setup?.portalConfigId,
    );
    return new NextResponse(null, { status: 303, headers: { Location: url } });
  } catch (e) {
    logger.error("billing: portal session failed", {
      userId: actor.userId,
      error: (e as Error).message,
    });
    return redirectTo("/settings?billing=error", 303);
  }
}
