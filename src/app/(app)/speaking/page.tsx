import { Mic } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { speakingTasks } from "@/db/schema";
import { SPEAKING_TASKS } from "@/lib/exam/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expression orale" };

export default async function SpeakingPage() {
  const tasks = await db.select().from(speakingTasks).orderBy(speakingTasks.taskNumber, speakingTasks.id);
  const byTask = new Map<number, typeof tasks>();
  for (const t of tasks) {
    const arr = byTask.get(t.taskNumber) ?? [];
    arr.push(t);
    byTask.set(t.taskNumber, arr);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <Mic className="h-5 w-5 text-navy" />
        <h1 className="display text-3xl">Expression orale</h1>
      </div>
      <p className="mb-8 max-w-2xl text-muted">
        Trois tâches, enregistrement réel avec réécoute et auto-évaluation guidée. Fonctionne même
        sans reconnaissance vocale : durée, audibilité, fluidité et couverture des points.
      </p>

      {SPEAKING_TASKS.map((spec) => {
        const list = byTask.get(spec.taskNumber) ?? [];
        return (
          <section key={spec.code} className="mb-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{spec.titleFr}</h2>
              <span className="text-sm text-muted">
                {spec.prepSeconds > 0 ? `${spec.prepSeconds} s prépa · ` : ""}
                {spec.speakSeconds} s de parole
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.slice(0, 8).map((task) => (
                <Link
                  key={task.id}
                  href={`/speaking/${task.id}`}
                  className="card p-4 transition hover:border-border-strong hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm">
                      {task.topic.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="navy" size="sm">
                      {task.cefrTarget}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink">{task.promptFr}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
