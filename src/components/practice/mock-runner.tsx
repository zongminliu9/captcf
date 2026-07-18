"use client";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { advanceMock, answerMock, startMockSectionAction } from "@/app/(app)/mock/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatClock } from "@/lib/exam/timer";
import type { MockState } from "@/lib/practice/mock";
import { cn } from "@/lib/utils";
import { MockSpeakingSection } from "./mock-speaking-section";
import { MockWritingSection } from "./mock-writing-section";
import { QuestionCard } from "./question-card";

type Section = NonNullable<MockState["section"]>;

export function MockRunner({
  sessionId,
  mockTitle,
  sectionIndex,
  totalSections,
  sectionLabels,
  section,
}: {
  sessionId: string;
  mockTitle: string;
  sectionIndex: number;
  totalSections: number;
  sectionLabels: string[];
  section: Section;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(section.remainingSeconds);
  const [expired, setExpired] = useState(false);
  const [, startTx] = useTransition();
  const startedRef = useRef(Date.now());

  useEffect(() => {
    if (!section.started) return;
    const base = section.remainingSeconds;
    const id = setInterval(() => {
      const left = Math.max(0, base - Math.round((Date.now() - startedRef.current) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setExpired(true);
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [section.started, section.remainingSeconds]);

  const beginSection = () =>
    startTx(async () => {
      await startMockSectionAction(sessionId);
      router.refresh();
    });

  // start gate
  if (!section.started) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card className="p-8 text-center" raised>
          <Badge variant="navy" className="mx-auto">
            {mockTitle} · Section {sectionIndex + 1}/{totalSections}
          </Badge>
          <h1 className="display mt-4 text-2xl">{section.label}</h1>
          <p className="mt-2 text-sm text-muted">
            {sectionDescription(section)} · {Math.round(section.durationSeconds / 60)} minutes.
          </p>
          <p className="mt-3 text-xs text-faint">
            Le chronomètre démarre dès que vous commencez et ne se réinitialise pas si vous
            rechargez la page. Une section terminée ne peut pas être rouverte.
          </p>
          <ol className="mx-auto mt-4 flex max-w-xs flex-wrap justify-center gap-1.5 text-xs">
            {sectionLabels.map((l, i) => (
              <li
                key={l}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  i < sectionIndex ? "bg-success-50 text-success" : i === sectionIndex ? "bg-navy-50 text-navy" : "bg-surface-2 text-muted",
                )}
              >
                {i + 1}. {l}
              </li>
            ))}
          </ol>
          <Button variant="primary" className="mt-6" onClick={beginSection}>
            Commencer la section
          </Button>
        </Card>
      </div>
    );
  }

  const low = remaining <= 60;
  const Timer = (
    <div className="sticky top-14 z-10 mb-4 flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-canvas/90 px-4 py-2.5 backdrop-blur">
      <div className="text-sm">
        <span className="font-medium">{section.label}</span>
        <span className="text-muted"> · section {sectionIndex + 1}/{totalSections}</span>
      </div>
      <div
        className={cn("flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums", low ? "text-danger" : "text-ink")}
        role="timer"
        aria-live="off"
      >
        {low && <AlertTriangle className="h-4 w-4" />}
        <Clock className="h-4 w-4" />
        {formatClock(remaining)}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:py-6">
      {Timer}
      {section.kind === "qcm" && (
        <QcmBody
          sessionId={sessionId}
          section={section}
          expired={expired}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
        />
      )}
      {section.kind === "writing" && (
        <MockWritingSection
          sessionId={sessionId}
          tasks={section.writingTasks ?? []}
          expired={expired}
          totalSections={totalSections}
          sectionIndex={sectionIndex}
        />
      )}
      {section.kind === "speaking" && (
        <MockSpeakingSection
          sessionId={sessionId}
          tasks={section.speakingTasks ?? []}
          expired={expired}
          totalSections={totalSections}
          sectionIndex={sectionIndex}
        />
      )}
    </div>
  );
}

function sectionDescription(section: Section): string {
  if (section.kind === "qcm") {
    return `${section.questions?.length ?? 0} questions${section.skill === "listening" ? " · audio à écoutes limitées" : ""}`;
  }
  if (section.kind === "writing") return `${section.writingTasks?.length ?? 0} tâches d'expression écrite`;
  return `${section.speakingTasks?.length ?? 0} tâches d'expression orale`;
}

function QcmBody({
  sessionId,
  section,
  expired,
  sectionIndex,
  totalSections,
}: {
  sessionId: string;
  section: Section;
  expired: boolean;
  sectionIndex: number;
  totalSections: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const questions = section.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries((section.answered ?? []).map((a) => [a.refId, a.selectedAnswer])),
  );
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(Date.now());
  const doneRef = useRef(false);

  const finish = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinishing(true);
    try {
      const res = await advanceMock(sessionId);
      if (res.done && res.attemptId) router.push(`/attempts/${res.attemptId}/results`);
      else router.refresh();
    } catch {
      toast("Échec.", "error");
      doneRef.current = false;
      setFinishing(false);
    }
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on expiry
  useEffect(() => {
    if (expired) finish();
  }, [expired]);

  const onSelect = (refId: string, optionId: string) => {
    setAnswers((a) => ({ ...a, [refId]: optionId }));
    const responseMs = Date.now() - startedRef.current;
    void answerMock(sessionId, { refId, selectedAnswer: optionId, responseMs }).catch(() =>
      toast("Enregistrement impossible.", "error"),
    );
  };

  const q = questions[index]!;
  const answeredCount = Object.values(answers).filter((v) => v != null).length;
  const isLast = sectionIndex + 1 >= totalSections;

  return (
    <>
      <QuestionCard
        q={q}
        index={index}
        total={questions.length}
        selected={answers[q.refId] ?? null}
        locked={false}
        onSelect={(opt) => onSelect(q.refId, opt)}
        allowTranscript={false}
        audioMaxPlays={section.skill === "listening" ? 2 : undefined}
      />
      <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Navigation des questions">
        {questions.map((qq, i) => (
          <button
            key={qq.refId}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition",
              i === index ? "ring-2 ring-navy ring-offset-2 ring-offset-canvas" : "",
              answers[qq.refId] != null ? "bg-navy" : "bg-surface-3",
            )}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        {index < questions.length - 1 ? (
          <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" onClick={finish} disabled={finishing}>
            {finishing ? "…" : isLast ? "Terminer l'examen" : "Section suivante"}
          </Button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        {answeredCount}/{questions.length} répondues
      </p>
    </>
  );
}
