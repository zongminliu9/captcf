import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionEditor } from "@/components/admin/question-editor";
import { Badge, cefrVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getFullQuestions } from "@/lib/practice/questions";

export const dynamic = "force-dynamic";

export default async function AdminQuestionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!row) notFound();
  const [full] = await getFullQuestions([id]);

  return (
    <div className="space-y-5">
      <Link href="/admin/questions" className="text-sm text-navy hover:underline">
        ← Toutes les questions
      </Link>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">{row.id}</span>
          <Badge variant={cefrVariant(row.cefrLevel)} size="sm">
            {row.cefrLevel}
          </Badge>
          <Badge variant="outline" size="sm">
            {row.skill}
          </Badge>
          <Badge variant="outline" size="sm">
            {row.subtype}
          </Badge>
        </div>

        {full && full.stimulus.kind === "text" && (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-surface-2 p-3 text-sm">
            {full.stimulus.title && <div className="mb-1 font-semibold">{full.stimulus.title}</div>}
            <p className="whitespace-pre-line text-ink">{full.stimulus.text}</p>
          </div>
        )}
        {full && full.stimulus.kind === "audio" && (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-surface-2 p-3 text-sm">
            <div className="text-muted">{full.stimulus.context}</div>
            {full.stimulus.audioFile && (
              // biome-ignore lint/a11y/useMediaCaption: transcript shown below
              <audio src={full.stimulus.audioFile} controls className="mt-2 w-full" />
            )}
            {full.transcript && <p className="mt-2 whitespace-pre-line text-xs text-faint">{full.transcript}</p>}
          </div>
        )}

        <p className="font-medium">{row.stem}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {full?.options.map((o) => (
            <li
              key={o.id}
              className={o.id === row.correctAnswer ? "font-medium text-success" : "text-ink"}
            >
              {o.id.toUpperCase()}. {o.text} {o.id === row.correctAnswer && "✓"}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <QuestionEditor id={row.id} status={row.status} stem={row.stem} explanation={row.explanation} />
      </Card>
    </div>
  );
}
