import { desc } from "drizzle-orm";
import { BookMarked, RotateCcw } from "lucide-react";
import { ReviewList, type ReviewEntry } from "@/components/practice/review-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getFullQuestions } from "@/lib/practice/questions";

export const dynamic = "force-dynamic";

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const actor = await getActor();

  if (!actor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Badge variant="navy">Mes favoris</Badge>
        <h1 className="display mt-2 text-3xl">Vos questions favorites</h1>
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Mettez des questions de côté pendant l'entraînement pour les retrouver ici et y revenir
            quand vous le souhaitez.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Commencer à m'entraîner</a>
          </Button>
        </Card>
      </div>
    );
  }

  const rows = await db
    .select({ questionId: bookmarks.questionId })
    .from(bookmarks)
    .where(ownerEq(bookmarks, actor))
    .orderBy(desc(bookmarks.createdAt));

  const ids = rows.map((r) => r.questionId);
  const full = await getFullQuestions(ids);
  const entries: ReviewEntry[] = full.map((q) => ({ question: q, selected: null, correct: null }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Badge variant="navy">Mes favoris</Badge>
        {entries.length > 0 && (
          <Badge variant="outline" size="sm">
            {entries.length} question(s)
          </Badge>
        )}
      </div>
      <h1 className="display mt-2 text-3xl">Vos questions favorites</h1>
      <p className="mt-2 text-sm text-muted">
        Les questions que vous avez mises de côté, prêtes à être revues ou retravaillées.
      </p>

      {empty === "1" && (
        <Alert tone="warning" className="mt-6">
          Aucun favori pour l'instant. Touchez l'icône marque-page pendant une séance pour ajouter
          une question ici.
        </Alert>
      )}

      {entries.length === 0 ? (
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Vous n'avez encore aucun favori. Pendant une séance, marquez les questions à revoir plus
            tard.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Nouvelle séance</a>
          </Button>
        </Card>
      ) : (
        <>
          <Card raised className="mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 text-sm font-semibold text-navy">
              <BookMarked className="h-4 w-4" />
              Transformez vos {entries.length} favori(s) en séance d'entraînement.
            </div>
            <Button asChild variant="primary" className="w-full sm:w-auto">
              <a href="/practice/start?mode=bookmarks">
                <RotateCcw className="h-4 w-4" /> S'entraîner sur mes favoris
              </a>
            </Button>
          </Card>

          <h2 className="mb-3 mt-8 text-lg font-semibold">Détail des favoris</h2>
          <ReviewList entries={entries} />
        </>
      )}
    </div>
  );
}
