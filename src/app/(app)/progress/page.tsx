import { and, desc, eq } from "drizzle-orm";
import { BarChart3, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { db } from "@/db";
import { attempts, masteryRecords } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { EXAM_SPEC, SKILLS, type SkillId } from "@/lib/exam/config";
import { scoreToNclc } from "@/lib/exam/nclc";
import { type MasteryState, masteryLabel } from "@/lib/mastery";
import { pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODE_LABELS: Record<string, string> = {
  quick: "Séance rapide",
  custom: "Personnalisé",
  diagnostic: "Diagnostic",
  review: "Révision",
  mistakes: "Mes erreurs",
  bookmarks: "Mes favoris",
  listening: "Compréhension orale",
  reading: "Compréhension écrite",
  mock: "Examen blanc",
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

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Transparent NCLC estimate from a mastery value, using the skill's score scale. */
function estimatedNclc(skill: SkillId, mastery: number): number {
  const scale = EXAM_SPEC[skill].scoreKind === "scale699" ? 699 : 20;
  return scoreToNclc(skill, Math.round(mastery * scale));
}

export default async function ProgressPage() {
  const actor = await getActor();

  if (!actor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Badge variant="navy">Progression</Badge>
        <h1 className="display mt-2 text-3xl">Votre progression</h1>
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Vos statistiques apparaîtront ici dès votre première séance : historique, précision et
            maîtrise par compétence.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Commencer à m'entraîner</a>
          </Button>
        </Card>
      </div>
    );
  }

  const [recent, masteryRows] = await Promise.all([
    db
      .select({
        id: attempts.id,
        mode: attempts.mode,
        correctItems: attempts.correctItems,
        totalItems: attempts.totalItems,
        submittedAt: attempts.submittedAt,
      })
      .from(attempts)
      .where(ownerEq(attempts, actor))
      .orderBy(desc(attempts.submittedAt))
      .limit(10),
    db
      .select({ skill: masteryRecords.skill, state: masteryRecords.state })
      .from(masteryRecords)
      .where(and(ownerEq(masteryRecords, actor), eq(masteryRecords.subtype, "_all"))),
  ]);

  const masteryBySkill = new Map<string, MasteryState>(
    masteryRows.map((r) => [r.skill, r.state as MasteryState]),
  );

  if (recent.length === 0 && masteryRows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Badge variant="navy">Progression</Badge>
        <h1 className="display mt-2 text-3xl">Votre progression</h1>
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted">
            Pas encore de données. Faites une première séance pour voir votre historique et votre
            maîtrise apparaître ici.
          </p>
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">Nouvelle séance</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <Badge variant="navy">Progression</Badge>
      <h1 className="display mt-2 flex items-center gap-2 text-3xl">
        <BarChart3 className="h-7 w-7 text-navy" aria-hidden />
        Votre progression
      </h1>
      <p className="mt-2 text-sm text-muted">
        Suivez votre maîtrise par compétence et l'historique de vos séances.
      </p>

      <section className="mt-8" aria-labelledby="mastery-heading">
        <h2 id="mastery-heading" className="text-lg font-semibold">
          Maîtrise par compétence
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SKILLS.map((skill) => {
            const state = masteryBySkill.get(skill);
            const spec = EXAM_SPEC[skill];
            if (!state || state.attempts === 0) {
              return (
                <Card key={skill} className="p-5">
                  <div className="font-semibold text-ink">{spec.labelFr}</div>
                  <p className="mt-2 text-sm text-muted">Pas encore travaillé.</p>
                </Card>
              );
            }
            const label = masteryLabel(state.mastery);
            const nclc = estimatedNclc(skill, state.mastery);
            return (
              <Card key={skill} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-ink">{spec.labelFr}</div>
                  <Badge variant="navy" size="sm">
                    {MASTERY_FR[label]}
                  </Badge>
                </div>
                <Meter
                  className="mt-3"
                  value={state.mastery}
                  tone={MASTERY_TONE[label]}
                  label="Maîtrise"
                  showValue
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{state.attempts} question(s) travaillée(s)</span>
                  {nclc > 0 && <span>NCLC estimé ~{nclc}</span>}
                </div>
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-faint">
          Le NCLC estimé est une projection non officielle fondée sur votre maîtrise ; il ne remplace
          pas un résultat officiel du TCF Canada.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="history-heading">
        <h2 id="history-heading" className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-navy" aria-hidden />
          Séances récentes
        </h2>
        {recent.length === 0 ? (
          <Card className="mt-3 p-5 text-sm text-muted">
            Aucune séance terminée pour l'instant.
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {recent.map((a) => {
              const accuracy = a.totalItems > 0 ? a.correctItems / a.totalItems : 0;
              return (
                <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">
                        {MODE_LABELS[a.mode] ?? a.mode}
                      </span>
                      <Badge variant="outline" size="sm">
                        {a.correctItems}/{a.totalItems}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{formatDate(a.submittedAt)}</div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Meter value={accuracy} tone="navy" label={`Précision ${pct(accuracy)}`} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
