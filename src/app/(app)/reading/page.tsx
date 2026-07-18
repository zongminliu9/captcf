import { and, eq, sql } from "drizzle-orm";
import { ArrowRight, BookOpenText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { db } from "@/db";
import { masteryRecords, questions } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { EXAM_SPEC, READING_SUBTYPES } from "@/lib/exam/config";
import { type MasteryState, masteryLabel } from "@/lib/mastery";
import { formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SKILL = "reading" as const;
const spec = EXAM_SPEC[SKILL];

const SUBTYPE_LABELS: Record<(typeof READING_SUBTYPES)[number], string> = {
  notice: "Avis et consignes",
  correspondence: "Correspondance",
  informative: "Texte informatif",
  argumentative: "Texte argumentatif",
  abstract: "Texte abstrait",
};

const MASTERY_FR: Record<ReturnType<typeof masteryLabel>, string> = {
  novice: "Débutant",
  developing: "En progression",
  proficient: "Confirmé",
  strong: "Avancé",
};

const MASTERY_TONE: Record<ReturnType<typeof masteryLabel>, "accent" | "gold" | "navy" | "success"> = {
  novice: "accent",
  developing: "gold",
  proficient: "navy",
  strong: "success",
};

export default async function ReadingPage() {
  const actor = await getActor();

  const [masteryRow, rawCounts] = await Promise.all([
    actor
      ? db
          .select({ state: masteryRecords.state })
          .from(masteryRecords)
          .where(
            and(
              ownerEq(masteryRecords, actor),
              eq(masteryRecords.skill, SKILL),
              eq(masteryRecords.subtype, "_all"),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ subtype: questions.subtype, n: sql<number>`count(*)::int` })
      .from(questions)
      .where(and(eq(questions.status, "published"), eq(questions.skill, SKILL)))
      .groupBy(questions.subtype),
  ]);

  const mastery = (masteryRow[0]?.state as MasteryState | undefined) ?? null;
  const countMap = new Map(rawCounts.map((r) => [r.subtype, r.n]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Badge variant="navy">{spec.code}</Badge>
        <Badge variant="outline" size="sm">
          {spec.itemCount} questions · {formatMinutes(spec.durationSeconds)}
        </Badge>
      </div>
      <h1 className="display mt-2 flex items-center gap-2 text-3xl">
        <BookOpenText className="h-7 w-7 text-navy" aria-hidden />
        {spec.labelFr}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Développez votre lecture sur des documents variés — annonces, correspondances, articles et
        textes d'opinion — de difficulté croissante, comme à l'examen.
      </p>

      <Alert tone="info" className="mt-5">
        Format officiel : {spec.description}
      </Alert>

      <Card raised className="mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Prêt à vous entraîner ?</h2>
          <p className="mt-1 text-sm text-muted">
            Une séance ciblée de {spec.labelFr.toLowerCase()}, adaptée à votre niveau actuel.
          </p>
        </div>
        <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
          <a href="/practice/start?mode=reading">
            Commencer <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </Card>

      <section className="mt-8" aria-labelledby="mastery-heading">
        <h2 id="mastery-heading" className="text-lg font-semibold">
          Votre maîtrise
        </h2>
        {mastery ? (
          <Card className="mt-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                {mastery.attempts} question(s) travaillée(s)
              </span>
              <Badge variant="navy" size="sm">
                {MASTERY_FR[masteryLabel(mastery.mastery)]}
              </Badge>
            </div>
            <Meter
              className="mt-3"
              value={mastery.mastery}
              tone={MASTERY_TONE[masteryLabel(mastery.mastery)]}
              label="Niveau de maîtrise"
              showValue
            />
          </Card>
        ) : (
          <Card className="mt-3 p-5 text-sm text-muted">
            Pas encore de données de maîtrise. Lancez une première séance pour commencer à suivre
            votre progression.
          </Card>
        )}
      </section>

      <section className="mt-8" aria-labelledby="subtypes-heading">
        <h2 id="subtypes-heading" className="text-lg font-semibold">
          Types de documents
        </h2>
        <p className="mt-1 text-sm text-muted">
          Les questions de lecture portent sur plusieurs genres de documents, du plus simple au plus
          exigeant.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {READING_SUBTYPES.map((st, i) => {
            const n = countMap.get(st) ?? 0;
            return (
              <Card key={st} className="flex items-center gap-3 p-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-muted"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{SUBTYPE_LABELS[st]}</div>
                  <div className="text-xs text-muted">
                    {n > 0 ? `${n} question(s) disponible(s)` : "Bientôt disponible"}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
