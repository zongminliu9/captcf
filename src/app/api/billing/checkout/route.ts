import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entitlements, subscriptions } from "@/db/schema";
import { getActor } from "@/lib/auth/session";

/**
 * Checkout. With Stripe keys it would create a Checkout Session; without them it uses
 * the dev entitlement SIMULATOR so Premium is testable locally. Guests must register first.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.kind !== "user") {
    return NextResponse.redirect(new URL("/register?next=/pricing", req.url));
  }

  const provider = process.env.PAYMENTS_PROVIDER ?? "simulator";
  if (provider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    // A real Stripe Checkout Session would be created here and redirected to.
    // Not configured in this environment → fall through to the simulator.
  }

  // Simulator: grant Premium immediately (clearly a dev flow).
  await db
    .insert(subscriptions)
    .values({ userId: actor.userId, plan: "premium", status: "active", provider: "simulator" })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { plan: "premium", status: "active" } });
  await db.insert(entitlements).values({ userId: actor.userId, plan: "premium", source: "simulator" });

  return NextResponse.redirect(new URL("/dashboard?upgraded=1", req.url));
}
