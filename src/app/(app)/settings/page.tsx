import {
  CancelSubscriptionButton,
  DeleteAccountButton,
  LogoutButton,
} from "@/components/settings/settings-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { examGoals } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { billingSnapshot } from "@/lib/billing/fulfill";
import { paymentsEnabled } from "@/lib/billing/stripe";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { CreditCard, Download, Sparkles, Target, User } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réglages" };

const BILLING_NOTICES: Record<string, { tone: "info" | "warning" | "danger"; text: string }> = {
  already: {
    tone: "info",
    text: "Vous avez déjà un abonnement Premium actif. Gérez-le ci-dessous.",
  },
  error: {
    tone: "danger",
    text: "Le portail de facturation est momentanément indisponible. Réessayez dans un instant.",
  },
  delete_blocked: {
    tone: "danger",
    text: "Votre abonnement n'a pas pu être résilié automatiquement, votre compte n'a donc pas été supprimé (pour éviter tout prélèvement). Résiliez d'abord l'abonnement via « Gérer mon abonnement », puis réessayez.",
  },
};

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" }).format(d);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing } = await searchParams;
  const notice = billing ? BILLING_NOTICES[billing] : undefined;
  const actor = await getActor();
  const plan = await getPlanForActor(actor);
  const goal = actor
    ? (await db.select().from(examGoals).where(ownerEq(examGoals, actor)).limit(1))[0]
    : null;
  const snap = actor?.kind === "user" ? await billingSnapshot(actor.userId) : null;
  const stripeSub = snap?.subscription?.provider === "stripe" ? snap.subscription : null;
  const canManage = paymentsEnabled() && !!stripeSub?.providerCustomerId;
  const localGrant = snap?.subscription?.provider === "simulator";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="display text-3xl">Réglages</h1>

      {notice && (
        <Alert tone={notice.tone} className="mt-4">
          {notice.text}
        </Alert>
      )}

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
          <User className="h-4 w-4" /> Compte
        </div>
        {actor?.kind === "user" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{actor.name ?? actor.email}</div>
              <div className="text-sm text-muted">{actor.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={plan === "premium" ? "navy" : "neutral"}>
                {plan === "premium" ? "Premium" : "Gratuit"}
              </Badge>
              {plan === "premium" && localGrant && <CancelSubscriptionButton />}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Vous êtes en mode invité. Créez un compte pour conserver votre progression.
            </p>
            <Button asChild variant="primary" size="sm">
              <Link href="/register">Créer un compte</Link>
            </Button>
          </div>
        )}
      </Card>

      {(stripeSub || snap?.passExpiresAt) && (
        <Card className="mt-4 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <CreditCard className="h-4 w-4" /> Abonnement et facturation
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-sm text-ink">
              {stripeSub?.status === "past_due" && (
                <p className="font-medium text-danger">
                  Le dernier paiement a échoué. Mettez à jour votre moyen de paiement pour garder
                  Premium.
                </p>
              )}
              {stripeSub && stripeSub.plan === "premium" && stripeSub.currentPeriodEnd && (
                <p>Période en cours jusqu'au {fmtDate(stripeSub.currentPeriodEnd)}.</p>
              )}
              {stripeSub && stripeSub.plan !== "premium" && <p>Abonnement terminé.</p>}
              {snap?.passExpiresAt && (
                <p>Accès Premium jusqu'au {fmtDate(snap.passExpiresAt)} (sans renouvellement).</p>
              )}
            </div>
            {canManage && (
              <form action="/api/billing/portal" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Gérer mon abonnement
                </Button>
              </form>
            )}
          </div>
          {canManage && (
            <p className="mt-3 text-xs text-muted">
              Moyen de paiement, factures et résiliation — via notre prestataire de paiement
              sécurisé Stripe. Après résiliation, Premium reste actif jusqu'à la fin de la période
              payée.
            </p>
          )}
        </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
          <Target className="h-4 w-4" /> Objectif
        </div>
        {goal ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-ink">
              NCLC {goal.targetNclc} · {goal.weeklyDays} j/sem · {goal.dailyMinutes} min/j
              {goal.examDate ? ` · examen ${goal.examDate}` : ""}
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/onboarding">Modifier</Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/onboarding">Définir mon objectif</Link>
          </Button>
        )}
      </Card>

      {plan !== "premium" && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5" raised>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-navy">
              <Sparkles className="h-4 w-4" /> Premium
            </div>
            <p className="mt-0.5 text-sm text-muted">
              Les 4 examens blancs complets et l'entraînement illimité.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/pricing">Voir Premium</Link>
          </Button>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="mb-3 text-sm font-semibold text-muted">Confidentialité</div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href="/api/account/export">
              <Download className="h-4 w-4" /> Exporter mes données
            </a>
          </Button>
          {actor?.kind === "user" && <DeleteAccountButton />}
        </div>
      </Card>

      {actor?.kind === "user" && (
        <div className="mt-6">
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
