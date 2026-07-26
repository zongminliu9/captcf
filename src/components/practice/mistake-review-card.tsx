import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { mistakes, questions, reviewQueue } from "@/db/schema";
import { type Actor, ownerEq } from "@/lib/auth/owner";
import { and, eq, lte, sql } from "drizzle-orm";
import { ArrowRight, NotebookPen } from "lucide-react";

/**
 * Prominent "mistake notebook" entry for the dashboard: how many are due today, the weakest
 * question type, and a one-click short review. This is the loop the professional reviewer
 * could not find — it must be visible without hunting through the nav.
 */
export async function MistakeReviewCard({ actor }: { actor: Actor }) {
  const [tally] = await db
    .select({
      open: sql<number>`count(*) FILTER (WHERE ${mistakes.resolved} = false)::int`,
      mastered: sql<number>`count(*) FILTER (WHERE ${mistakes.resolved} = true)::int`,
      repeated: sql<number>`count(*) FILTER (WHERE ${mistakes.wrongCount} > 1 AND ${mistakes.resolved} = false)::int`,
    })
    .from(mistakes)
    .where(ownerEq(mistakes, actor));

  const [due] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviewQueue)
    .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, new Date())));

  const weakest = await db
    .select({ subtype: questions.subtype, n: sql<number>`count(*)::int` })
    .from(mistakes)
    .innerJoin(questions, eq(questions.id, mistakes.questionId))
    .where(and(ownerEq(mistakes, actor), eq(mistakes.resolved, false)))
    .groupBy(questions.subtype)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const open = tally?.open ?? 0;
  const dueNow = due?.n ?? 0;

  if (open === 0 && (tally?.mastered ?? 0) === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <NotebookPen className="h-4 w-4" /> Carnet d'erreurs
        </div>
        <p className="mt-2 text-sm text-muted">
          Vos questions manquées arriveront ici automatiquement, avec la bonne réponse,
          l'explication et un rappel au bon moment.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href="/practice/start?mode=quick">Faire une séance</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" raised>
      <div className="border-l-4 border-accent p-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <NotebookPen className="h-4 w-4" /> Carnet d'erreurs
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums">{dueNow}</span>
          <span className="text-sm text-muted">à revoir aujourd'hui</span>
          <span className="text-sm text-muted">
            · {open} en cours · {tally?.mastered ?? 0} maîtrisée(s)
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {weakest[0] && (
            <Badge variant="warning" size="sm">
              Point faible : {weakest[0].subtype} ({weakest[0].n})
            </Badge>
          )}
          {(tally?.repeated ?? 0) > 0 && (
            <Badge variant="danger" size="sm">
              {tally?.repeated} erreur(s) répétée(s)
            </Badge>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="primary" size="sm">
            <a href={dueNow > 0 ? "/practice/start?mode=review" : "/practice/start?mode=mistakes"}>
              Réviser 5–10 min <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/mistakes">Ouvrir le carnet</a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
