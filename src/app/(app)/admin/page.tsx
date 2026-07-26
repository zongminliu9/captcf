import { BetaGrant } from "@/components/admin/beta-grant";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import {
  contentAudits,
  issueReports,
  mockTests,
  priceIntents,
  questions,
  speakingTasks,
  vocabularyItems,
  writingTasks,
} from "@/db/schema";
import { intentSummary } from "@/lib/pricing/experiment";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [qBySkill, wCount, sCount, vCount, mCount, openReports, lastAudit] = await Promise.all([
    db
      .select({ skill: questions.skill, status: questions.status, n: sql<number>`count(*)::int` })
      .from(questions)
      .groupBy(questions.skill, questions.status),
    db.select({ n: sql<number>`count(*)::int` }).from(writingTasks),
    db.select({ n: sql<number>`count(*)::int` }).from(speakingTasks),
    db.select({ n: sql<number>`count(*)::int` }).from(vocabularyItems),
    db.select({ n: sql<number>`count(*)::int` }).from(mockTests),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(issueReports)
      .where(eq(issueReports.status, "open")),
    db.select().from(contentAudits).orderBy(desc(contentAudits.runAt)).limit(1),
  ]);

  const intentRows = await db
    .select({
      willingness: priceIntents.willingness,
      band: priceIntents.priceBand,
      n: sql<number>`count(*)::int`,
    })
    .from(priceIntents)
    .groupBy(priceIntents.willingness, priceIntents.priceBand);
  const tally = { total: 0, yes: 0, maybe: 0, no: 0 };
  for (const r of intentRows) {
    tally.total += r.n;
    if (r.willingness === "yes") tally.yes += r.n;
    else if (r.willingness === "maybe") tally.maybe += r.n;
    else if (r.willingness === "no") tally.no += r.n;
  }
  const intent = intentSummary(tally);
  const bandCounts = intentRows
    .filter((r) => r.band)
    .reduce<Record<string, number>>((m, r) => {
      m[r.band as string] = (m[r.band as string] ?? 0) + r.n;
      return m;
    }, {});

  const listening = qBySkill.filter((r) => r.skill === "listening").reduce((s, r) => s + r.n, 0);
  const reading = qBySkill.filter((r) => r.skill === "reading").reduce((s, r) => s + r.n, 0);
  const published = qBySkill.filter((r) => r.status === "published").reduce((s, r) => s + r.n, 0);

  const tiles = [
    { label: "Écoute", value: listening },
    { label: "Lecture", value: reading },
    { label: "Tâches écrit", value: wCount[0]?.n ?? 0 },
    { label: "Tâches oral", value: sCount[0]?.n ?? 0 },
    { label: "Vocabulaire", value: vCount[0]?.n ?? 0 },
    { label: "Examens blancs", value: mCount[0]?.n ?? 0 },
    { label: "Publiées", value: published },
    { label: "Signalements ouverts", value: openReports[0]?.n ?? 0 },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-2xl font-semibold text-navy tabular-nums">{t.value}</div>
            <div className="mt-1 text-sm text-muted">{t.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-2 text-sm font-semibold text-muted">Dernier audit de contenu</div>
        {lastAudit[0] ? (
          <div className="flex items-center gap-3">
            <Badge variant={lastAudit[0].passed ? "success" : "danger"}>
              {lastAudit[0].passed ? "Réussi" : "Échec"}
            </Badge>
            <span className="text-sm text-muted">
              {new Date(lastAudit[0].runAt).toLocaleString("fr-CA")}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Aucun audit enregistré. Lancez{" "}
            <code className="rounded bg-surface-2 px-1">pnpm content:audit</code>.
          </p>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-1 text-sm font-semibold text-muted">
          Intentions de prix (Beta — aucun paiement)
        </div>
        {intent.sample === 0 ? (
          <p className="text-sm text-muted">
            Aucune réponse pour le moment. Les chiffres n'apparaîtront qu'avec de vraies réponses.
          </p>
        ) : (
          <div className="text-sm">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>
                Échantillon : <strong className="tabular-nums">{intent.sample}</strong>
              </span>
              <span>
                Oui : <strong className="tabular-nums">{tally.yes}</strong> (
                {Math.round((intent.yesRate ?? 0) * 100)}%)
              </span>
              <span>
                Peut-être : <strong className="tabular-nums">{tally.maybe}</strong>
              </span>
              <span>
                Non : <strong className="tabular-nums">{tally.no}</strong>
              </span>
            </div>
            {Object.keys(bandCounts).length > 0 && (
              <div className="mt-2 text-muted">
                Fourchettes :{" "}
                {Object.entries(bandCounts)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-1 text-sm font-semibold text-muted">Accès Beta (sans paiement)</div>
        <p className="mb-3 text-sm text-muted">
          Accordez l'accès Premium à un testeur invité par son courriel. Les paiements réels sont
          désactivés pendant la Beta privée.
        </p>
        <BetaGrant />
      </Card>
    </div>
  );
}
