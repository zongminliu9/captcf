import { db } from "@/db";
import { entitlements, subscriptions } from "@/db/schema";
import { getActor } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Checkout.
 * - Stripe (with keys): a real Checkout Session would be created here.
 * - Beta / no real provider: payments are intentionally disabled — we redirect back to /pricing
 *   with a notice and grant NOTHING, so no one can self-upgrade in the hosted beta. Invited
 *   testers get Premium via the admin "grant Beta access" action instead.
 * - Dev only: the entitlement SIMULATOR grants Premium immediately so it is testable locally.
 * Guests must register first.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") {
    return NextResponse.redirect(new URL("/register?next=/pricing", req.url));
  }

  const provider = process.env.PAYMENTS_PROVIDER ?? "simulator";
  if (provider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    // A real Stripe Checkout Session would be created here and redirected to.
    return NextResponse.redirect(new URL("/pricing?checkout=stripe-not-configured", req.url));
  }

  // Anywhere other than an explicit dev simulator (i.e. the hosted beta), grant nothing.
  if (provider !== "simulator" || process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/pricing?beta=1", req.url));
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

  return NextResponse.redirect(new URL("/dashboard?upgraded=1", req.url));
}
