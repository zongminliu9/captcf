"use server";
import { db } from "@/db";
import { priceIntents } from "@/db/schema";
import { ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { type PriceIntentInput, validateIntent } from "@/lib/pricing/experiment";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export interface IntentResult {
  ok: boolean;
  message: string;
}

/**
 * Record a price-INTENT. No money moves. Works for guests and signed-in users; one row per
 * owner+variant (upsert) so repeated clicks update rather than inflate the tally.
 */
export async function submitPriceIntent(input: PriceIntentInput): Promise<IntentResult> {
  const actor = await ensureActor();
  const rl = await rateLimit(clientKey(await headers(), "price-intent"), 20, 3600);
  if (!rl.allowed) return { ok: false, message: "Trop de réponses. Réessayez plus tard." };

  const parsed = validateIntent(input);
  if (!parsed.ok || !parsed.value) {
    return { ok: false, message: "Réponse invalide." };
  }
  const v = parsed.value;

  await db
    .insert(priceIntents)
    .values({ ...ownerValues(actor), ...v })
    .onConflictDoUpdate({
      target:
        actor.kind === "user"
          ? [priceIntents.userId, priceIntents.variantId]
          : [priceIntents.guestId, priceIntents.variantId],
      set: {
        willingness: v.willingness,
        modelPreference: v.modelPreference,
        priceBand: v.priceBand,
        reason: v.reason,
        blocker: v.blocker,
        comment: v.comment,
        updatedAt: new Date(),
      },
    });

  return { ok: true, message: "Merci ! Votre réponse nous aide à fixer un prix juste." };
}
