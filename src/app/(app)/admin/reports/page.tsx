import { desc } from "drizzle-orm";
import { ReportActions } from "@/components/admin/report-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { issueReports } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await db.select().from(issueReports).orderBy(desc(issueReports.createdAt)).limit(100);

  if (reports.length === 0) {
    return <p className="text-sm text-muted">Aucun signalement pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={r.status === "open" ? "warning" : r.status === "resolved" ? "success" : "neutral"}
              size="sm"
            >
              {r.status}
            </Badge>
            <Badge variant="outline" size="sm">
              {r.category}
            </Badge>
            <span className="font-mono text-xs text-muted">{r.refId}</span>
            <span className="ml-auto text-xs text-faint">
              {new Date(r.createdAt).toLocaleDateString("fr-CA")}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink">{r.message}</p>
          {r.status === "open" && (
            <div className="mt-3">
              <ReportActions id={r.id} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
