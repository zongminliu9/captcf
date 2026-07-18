import { type ReviewEntry, ReviewList } from "@/components/practice/review-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { mistakes } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getFullQuestions } from "@/lib/practice/questions";
import { and, desc, eq } from "drizzle-orm";
import { ListChecks, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const actor = await getActor();

  if (!actor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Badge variant="navy">Mes erreurs</Badge>
        <h1 className="display mt-2 text-3xl">Vos erreurs à revoir</h1>
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Vos questions manquées s'accumuleront ici pour que vous puissiez les retravailler.
            Commencez par une séance d'entraînement.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Commencer à m'entraîner</a>
          </Button>
        </Card>
      </div>
    );
  }

  const rows = await db
    .select({ questionId: mistakes.questionId })
    .from(mistakes)
    .where(and(ownerEq(mistakes, actor), eq(mistakes.resolved, false)))
    .orderBy(desc(mistakes.lastWrongAt));

  const ids = rows.map((r) => r.questionId);
  const full = await getFullQuestions(ids);
  const entries: ReviewEntry[] = full.map((q) => ({ question: q, selected: null, correct: false }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Badge variant="navy">Mes erreurs</Badge>
        {entries.length > 0 && (
          <Badge variant="outline" size="sm">
            {entries.length} à revoir
          </Badge>
        )}
      </div>
      <h1 className="display mt-2 text-3xl">Vos erreurs à revoir</h1>
      <p className="mt-2 text-sm text-muted">
        Les questions que vous avez manquées, rassemblées ici jusqu'à ce que vous les maîtrisiez.
      </p>

      {empty === "1" && (
        <Alert tone="warning" className="mt-6">
          Aucune erreur à retravailler pour le moment. Continuez à vous entraîner — les questions
          manquées apparaîtront ici.
        </Alert>
      )}

      {entries.length === 0 ? (
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Rien à revoir : vous n'avez aucune erreur en attente. Excellent travail !
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Nouvelle séance</a>
          </Button>
        </Card>
      ) : (
        <>
          <Card raised className="mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 text-sm font-semibold text-navy">
              <ListChecks className="h-4 w-4" />
              Entraînez-vous en priorité sur ces {entries.length} question(s).
            </div>
            <Button asChild variant="primary" className="w-full sm:w-auto">
              <a href="/practice/start?mode=mistakes">
                <RotateCcw className="h-4 w-4" /> Réviser mes erreurs
              </a>
            </Button>
          </Card>

          <h2 className="mb-3 mt-8 text-lg font-semibold">Détail des erreurs</h2>
          <ReviewList entries={entries} />
        </>
      )}
    </div>
  );
}
