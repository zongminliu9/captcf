import { getActor } from "@/lib/auth/session";
import { fulfillCheckoutSession } from "@/lib/billing/fulfill";
import { getCheckoutSession, paymentsEnabled } from "@/lib/billing/stripe";
import { redirectTo } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe Checkout return URL. Fulfils synchronously (so access is there the moment the learner
 * lands, even if the webhook is a few seconds behind) — idempotent with the webhook. The session
 * is re-read from Stripe server-side; nothing in the query string is trusted beyond its id, and
 * it must belong to the signed-in user.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  const actor = await getActor();
  if (!actor || actor.kind !== "user") return redirectTo("/login?next=/settings");
  if (!paymentsEnabled() || !sessionId.startsWith("cs_")) return redirectTo("/pricing");

  try {
    const session = await getCheckoutSession(sessionId);
    const owner = session.client_reference_id ?? session.metadata?.userId;
    if (owner !== actor.userId) return redirectTo("/pricing");
    const result = await fulfillCheckoutSession(session);
    if (result === "premium") return redirectTo("/dashboard?upgraded=1");
    return redirectTo("/pricing?checkout=pending");
  } catch (e) {
    logger.error("billing: success fulfilment failed", { sessionId, error: (e as Error).message });
    // The webhook will still complete fulfilment; tell the learner it's being processed.
    return redirectTo("/pricing?checkout=pending");
  }
}
