import { and, eq, lte, sql } from "drizzle-orm";
import { CalendarClock, Play, Repeat } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, cefrVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { questions, reviewQueue } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

const SKILL_FR: Record<string, string> = { listening: "Écoute", reading: "Lecture" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const actor = await getActor();

  if (!actor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Badge variant="navy">Révision</Badge>
        <h1 className="display mt-2 text-3xl">Vos révisions espacées</h1>
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            La révision espacée vous ramène chaque question au bon moment pour l'ancrer durablement.
            Commencez par vous entraîner pour alimenter votre file de révision.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Commencer à m'entraîner</a>
          </Button>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const [dueCountRow, totalCountRow, dueList] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewQueue)
      .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, now))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewQueue)
      .where(ownerEq(reviewQueue, actor)),
    db
      .select({
        questionId: reviewQueue.questionId,
        dueAt: reviewQueue.dueAt,
        stem: questions.stem,
        skill: questions.skill,
        cefr: questions.cefrLevel,
      })
      .from(reviewQueue)
      .innerJoin(questions, eq(questions.id, reviewQueue.questionId))
      .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, now)))
      .orderBy(reviewQueue.dueAt)
      .limit(50),
  ]);

  const dueCount = dueCountRow[0]?.n ?? 0;
  const total = totalCountRow[0]?.n ?? 0;
  const upcoming = Math.max(0, total - dueCount);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Badge variant="navy">Révision</Badge>
      <h1 className="display mt-2 text-3xl">Vos révisions espacées</h1>
      <p className="mt-2 text-sm text-muted">
        Un algorithme de répétition espacée (SM-2) planifie chaque question au moment le plus utile
        pour votre mémoire.
      </p>

      {empty === "1" && (
        <Alert tone="warning" className="mt-6">
          Aucune révision disponible pour l'instant. Revenez plus tard : vos questions réapparaîtront
          à leur échéance.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm text-muted">À réviser aujourd'hui</div>
          <div className="mt-1 text-3xl font-semibold text-navy tabular-nums">{dueCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted">À venir</div>
          <div className="mt-1 text-3xl font-semibold text-ink tabular-nums">{upcoming}</div>
        </Card>
      </div>

      {dueCount > 0 ? (
        <>
          <Card raised className="mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 text-sm font-semibold text-navy">
              <Repeat className="h-4 w-4" />
              {dueCount} question(s) vous attendent aujourd'hui.
            </div>
            <Button asChild variant="primary" className="w-full sm:w-auto">
              <a href="/practice/start?mode=review">
                <Play className="h-4 w-4" /> Commencer la révision
              </a>
            </Button>
          </Card>

          <h2 className="mb-3 mt-8 text-lg font-semibold">Questions dues</h2>
          <div className="space-y-3">
            {dueList.map((r) => (
              <Card key={r.questionId} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium text-ink">{r.stem}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <Badge variant={cefrVariant(r.cefr)} size="sm">
                      {r.cefr}
                    </Badge>
                    {SKILL_FR[r.skill] ?? r.skill}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  <span>Échéance {formatDate(r.dueAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-4 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            {total > 0
              ? "Rien à réviser pour le moment — vous êtes à jour. Vos prochaines révisions apparaîtront à leur échéance."
              : "Votre file de révision est vide. Entraînez-vous pour commencer à l'alimenter."}
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Nouvelle séance</a>
          </Button>
        </Card>
      )}
    </div>
  );
}
