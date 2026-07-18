import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; status?: string; q?: string; cefr?: string }>;
}) {
  const sp = await searchParams;
  const conds = [];
  if (sp.skill && ["listening", "reading"].includes(sp.skill))
    conds.push(eq(questions.skill, sp.skill as any));
  if (sp.status) conds.push(eq(questions.status, sp.status as any));
  if (sp.cefr) conds.push(eq(questions.cefrLevel, sp.cefr));
  if (sp.q) conds.push(ilike(questions.stem, `%${sp.q}%`));

  const rows = await db
    .select({
      id: questions.id,
      skill: questions.skill,
      cefr: questions.cefrLevel,
      topic: questions.topic,
      status: questions.status,
      stem: questions.stem,
    })
    .from(questions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(questions.id)
    .limit(100);

  const totalRows = await db.select({ total: sql<number>`count(*)::int` }).from(questions);
  const total = totalRows[0]?.total ?? 0;

  const filterLink = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    for (const [k, v] of Object.entries(patch)) v ? params.set(k, v) : params.delete(k);
    return `/admin/questions?${params.toString()}`;
  };

  return (
    <div>
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Rechercher dans l'énoncé…"
          className="h-9 flex-1 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
        />
        <select
          name="skill"
          defaultValue={sp.skill ?? ""}
          className="h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"
        >
          <option value="">Toutes compétences</option>
          <option value="listening">Écoute</option>
          <option value="reading">Lecture</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="published">Publiée</option>
          <option value="draft">Brouillon</option>
          <option value="in_review">En révision</option>
          <option value="retired">Retirée</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-[var(--radius-sm)] bg-navy px-4 text-sm font-medium text-on-navy"
        >
          Filtrer
        </button>
      </form>

      <p className="mb-3 text-sm text-muted">
        {rows.length} affichée(s) sur {total} au total {rows.length === 100 && "(100 max)"}.{" "}
        {(sp.skill || sp.status || sp.q || sp.cefr) && (
          <Link href="/admin/questions" className="text-navy hover:underline">
            Réinitialiser
          </Link>
        )}
      </p>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Compétence</th>
              <th className="px-3 py-2">CEFR</th>
              <th className="px-3 py-2">Énoncé</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/questions/${r.id}`}
                    className="font-mono text-xs text-navy hover:underline"
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.skill}</td>
                <td className="px-3 py-2">{r.cefr}</td>
                <td className="max-w-xs truncate px-3 py-2 text-ink">{r.stem}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.status === "published" ? "success" : "neutral"} size="sm">
                    {r.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
