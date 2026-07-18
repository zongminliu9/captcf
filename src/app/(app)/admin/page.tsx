import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import {
  contentAudits,
  issueReports,
  mockTests,
  questions,
  speakingTasks,
  vocabularyItems,
  writingTasks,
} from "@/db/schema";
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
    </div>
  );
}
