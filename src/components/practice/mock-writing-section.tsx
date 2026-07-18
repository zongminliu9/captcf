"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { advanceMock, saveMockWriting } from "@/app/(app)/mock/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import type { MockWritingTask } from "@/lib/practice/mock";
import { cn } from "@/lib/utils";

export function MockWritingSection({
  sessionId,
  tasks,
  expired,
  totalSections,
  sectionIndex,
}: {
  sessionId: string;
  tasks: MockWritingTask[];
  expired: boolean;
  totalSections: number;
  sectionIndex: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [texts, setTexts] = useState<Record<string, string>>(
    Object.fromEntries(tasks.map((t) => [t.id, t.draft])),
  );
  const [active, setActive] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const doneRef = useRef(false);

  const finish = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinishing(true);
    try {
      await saveMockWriting(
        sessionId,
        tasks.map((t) => ({ taskId: t.id, text: texts[t.id] ?? "" })),
      );
      const res = await advanceMock(sessionId);
      if (res.done && res.attemptId) router.push(`/attempts/${res.attemptId}/results`);
      else router.refresh();
    } catch {
      toast("Échec de l'enregistrement.", "error");
      doneRef.current = false;
      setFinishing(false);
    }
  };

  // auto-submit the section on timeout
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once when expired flips
  useEffect(() => {
    if (expired) finish();
  }, [expired]);

  const task = tasks[active]!;
  const wc = (texts[task.id] ?? "").trim() ? (texts[task.id] ?? "").trim().split(/\s+/).length : 0;
  const isLast = sectionIndex + 1 >= totalSections;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tasks.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              i === active ? "border-navy bg-navy-50 text-navy" : "border-border-strong text-muted hover:bg-surface-2",
            )}
          >
            Tâche {i + 1}
            {(texts[t.id] ?? "").trim() ? " ✓" : ""}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <Badge variant="navy">Tâche {active + 1}</Badge>
          <span className={cn("text-sm", wc >= task.minWords && wc <= task.maxWords ? "text-success" : "text-muted")}>
            {wc} / {task.minWords}–{task.maxWords} mots
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{task.contextFr}</p>
        <p className="mt-1 font-medium leading-snug">{task.promptFr}</p>
        <Textarea
          className="mt-3"
          rows={10}
          value={texts[task.id] ?? ""}
          onChange={(e) => setTexts((s) => ({ ...s, [task.id]: e.target.value }))}
          placeholder="Rédigez votre réponse ici…"
          aria-label={`Rédaction tâche ${active + 1}`}
        />
      </Card>

      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={finish} disabled={finishing}>
          {finishing ? "…" : isLast ? "Terminer l'examen" : "Terminer l'expression écrite"}
        </Button>
      </div>
    </div>
  );
}
