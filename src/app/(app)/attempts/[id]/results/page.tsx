import { type ReviewEntry, ReviewList } from "@/components/practice/review-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { db } from "@/db";
import { attempts, practiceSessions, responses } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { EXAM_SPEC, type SkillId } from "@/lib/exam/config";
import type { ScoreEstimate } from "@/lib/exam/scoring";
import { getFullQuestions } from "@/lib/practice/questions";
import { pct } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PerSkill {
  answered: number;
  correct: number;
  estimate: ScoreEstimate;
}

interface ProductiveEntry {
  kind: "productive";
  tasks: number;
  band: number;
  cefr: string;
  nclc: number;
  source: string;
}

function isProductive(v: PerSkill | ProductiveEntry): v is ProductiveEntry {
  return (v as ProductiveEntry).kind === "productive";
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect("/");

  const rows = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, id), ownerEq(attempts, actor)))
    .limit(1);
  const attempt = rows[0];
  if (!attempt) notFound();

  // mark the session reviewed (best effort)
  await db
    .update(practiceSessions)
    .set({ status: "reviewed" })
    .where(and(eq(practiceSessions.id, attempt.sessionId), eq(practiceSessions.status, "graded")));

  const [session] = await db
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.id, attempt.sessionId))
    .limit(1);
  const resp = await db.select().from(responses).where(eq(responses.sessionId, attempt.sessionId));
  const respMap = new Map(resp.map((r) => [r.refId, r]));

  const ids = (session?.itemOrder ?? [])
    .filter((i) => i.refType === "question")
    .map((i) => i.refId);
  const full = await getFullQuestions(ids);
  const entries: ReviewEntry[] = full.map((q) => {
    const r = respMap.get(q.refId);
    return { question: q, selected: r?.selectedAnswer ?? null, correct: r?.correct ?? null };
  });

  const perSkill = attempt.perSkill as Record<string, PerSkill | ProductiveEntry>;
  const allKeys = Object.keys(perSkill) as SkillId[];
  const qcmSkills = allKeys.filter((s) => !isProductive(perSkill[s]!));
  const productiveSkills = allKeys.filter((s) => isProductive(perSkill[s]!));
  const isMock = attempt.mode === "mock";
  const answeredCount = entries.filter((e) => e.selected != null).length;
  const overallAccuracy = answeredCount ? attempt.correctItems / answeredCount : 0;

  // weakest QCM skill for the "next" nudge
  const weakest = qcmSkills
    .map((s) => ({ s, acc: (perSkill[s] as PerSkill).estimate.accuracy }))
    .sort((a, b) => a.acc - b.acc)[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="navy">Résultats</Badge>
        <Badge variant="outline" size="sm">
          {attempt.correctItems}/{entries.filter((e) => e.selected != null).length} correctes
        </Badge>
      </div>
      <h1 className="display text-3xl">
        {isMock ? "Résultats de l'examen blanc" : "Votre analyse"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Précision globale {pct(overallAccuracy)} sur {answeredCount} question(s) répondue(s).
        {isMock && " Les épreuves écrite et orale sont évaluées localement (auto-évaluation)."}
      </p>

      {/* auto-scored (QCM) estimates */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {qcmSkills.map((skill) => {
          const ps = perSkill[skill] as PerSkill;
          const est = ps.estimate;
          return (
            <Card key={skill} className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{EXAM_SPEC[skill].labelFr}</h2>
                <Badge variant={est.confidence === "high" ? "success" : "warning"} size="sm">
                  confiance {est.confidence}
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="text-3xl font-semibold text-navy tabular-nums">{est.score}</div>
                <div className="pb-1 text-sm text-muted">/ 699</div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-medium">
                    {est.cefr === "below-A1" ? "—" : est.cefr}
                  </div>
                  <div className="text-xs text-muted">NCLC {est.nclc || "—"}</div>
                </div>
              </div>
              <Meter
                className="mt-3"
                value={est.accuracy}
                tone="navy"
                label="Précision"
                showValue
              />
              <p className="mt-2 text-xs text-faint">{est.disclaimer}</p>
            </Card>
          );
        })}
      </div>

      {/* productive (writing/speaking) local self-evaluation */}
      {productiveSkills.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {productiveSkills.map((skill) => {
            const p = perSkill[skill] as ProductiveEntry;
            return (
              <Card key={skill} className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{EXAM_SPEC[skill].labelFr}</h2>
                  <Badge variant="warning" size="sm">
                    auto-évaluation locale
                  </Badge>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="text-3xl font-semibold text-navy tabular-nums">{p.band}</div>
                  <div className="pb-1 text-sm text-muted">/ 20</div>
                  <div className="ml-auto text-right">
                    <div className="text-sm font-medium">
                      {p.cefr === "below-A1" ? "—" : p.cefr}
                    </div>
                    <div className="text-xs text-muted">NCLC {p.nclc || "—"}</div>
                  </div>
                </div>
                <Meter
                  className="mt-3"
                  value={p.band / 20}
                  tone="gold"
                  label={`${p.tasks} tâche(s)`}
                  showValue
                />
                <p className="mt-2 text-xs text-faint">
                  Estimation locale non officielle (sans IA/reconnaissance vocale).
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* next steps */}
      <Card className="mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center" raised>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Sparkles className="h-4 w-4" /> Prochaine étape
          </div>
          <p className="mt-1 text-sm text-muted">
            {weakest
              ? `Renforcez votre ${EXAM_SPEC[weakest.s].labelFr.toLowerCase()} (précision ${pct(weakest.acc)}).`
              : "Continuez sur votre lancée."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/practice/start?mode=quick">
              <RotateCcw className="h-4 w-4" /> Nouvelle séance
            </a>
          </Button>
          <Button asChild variant="primary">
            <Link href="/dashboard">
              Tableau de bord <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Revoir les réponses</h2>
      <ReviewList entries={entries} />
    </div>
  );
}
