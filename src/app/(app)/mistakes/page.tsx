import { type ReviewEntry, ReviewList } from "@/components/practice/review-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { mistakes, reviewQueue } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getFullQuestions } from "@/lib/practice/questions";
import { MASTERY_STREAK } from "@/lib/practice/session";
import { and, desc, eq, sql } from "drizzle-orm";
import { ListChecks, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string; f?: string }>;
}) {
  const { empty, f } = await searchParams;
  const filter = f ?? "open";
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

  const conds = [ownerEq(mistakes, actor)];
  if (filter === "open") conds.push(eq(mistakes.resolved, false));
  else if (filter === "mastered") conds.push(eq(mistakes.resolved, true));
  else if (filter === "repeated")
    conds.push(and(eq(mistakes.resolved, false), sql`${mistakes.wrongCount} > 1`)!);

  const rows = await db
    .select({
      questionId: mistakes.questionId,
      wrongCount: mistakes.wrongCount,
      correctStreak: mistakes.correctStreak,
      resolved: mistakes.resolved,
      firstWrongAt: mistakes.firstWrongAt,
      lastWrongAt: mistakes.lastWrongAt,
      lastSeenAt: mistakes.lastSeenAt,
      lastWrongAnswer: mistakes.lastWrongAnswer,
      addedReason: mistakes.addedReason,
      dueAt: reviewQueue.dueAt,
    })
    .from(mistakes)
    .leftJoin(
      reviewQueue,
      and(eq(reviewQueue.questionId, mistakes.questionId), ownerEq(reviewQueue, actor)),
    )
    .where(and(...conds))
    .orderBy(desc(mistakes.lastWrongAt))
    .limit(200);

  const ids = rows.map((r) => r.questionId);
  const full = await getFullQuestions(ids);
  const metaById = new Map(rows.map((r) => [r.questionId, r]));
  const entries: ReviewEntry[] = full.map((q) => ({
    question: q,
    selected: metaById.get(q.refId)?.lastWrongAnswer ?? null,
    correct: false,
    meta: (() => {
      const m = metaById.get(q.refId);
      if (!m) return undefined;
      const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-CA") : "—");
      return {
        wrongCount: m.wrongCount,
        correctStreak: m.correctStreak,
        mastered: m.resolved,
        masteryStreakTarget: MASTERY_STREAK,
        firstWrongAt: fmt(m.firstWrongAt),
        lastWrongAt: fmt(m.lastWrongAt),
        lastSeenAt: fmt(m.lastSeenAt),
        dueAt: fmt(m.dueAt),
        addedReason: m.addedReason,
      };
    })(),
  }));

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

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Filtre :</span>
            {[
              ["open", "En cours"],
              ["repeated", "Erreurs répétées"],
              ["mastered", "Maîtrisées"],
              ["all", "Toutes"],
            ].map(([key, label]) => (
              <a
                key={key}
                href={`/mistakes?f=${key}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === key
                    ? "border-navy bg-navy-50 text-navy"
                    : "border-border-strong text-muted"
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          <h2 className="mb-3 mt-6 text-lg font-semibold">Détail des erreurs</h2>
          <ReviewList entries={entries} />
        </>
      )}
    </div>
  );
}
