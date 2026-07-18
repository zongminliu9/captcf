import { DeleteAccountButton, LogoutButton } from "@/components/settings/settings-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { examGoals } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { Download, Sparkles, Target, User } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const actor = await getActor();
  const plan = await getPlanForActor(actor);
  const goal = actor
    ? (await db.select().from(examGoals).where(ownerEq(examGoals, actor)).limit(1))[0]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="display text-3xl">Réglages</h1>

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
            <Badge variant={plan === "premium" ? "navy" : "neutral"}>
              {plan === "premium" ? "Premium" : "Gratuit"}
            </Badge>
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
              Examens blancs illimités, analyses avancées, réponses modèles.
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
