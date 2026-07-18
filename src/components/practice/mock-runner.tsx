"use client";
import { advanceMock, answerMock, startMockSectionAction } from "@/app/(app)/mock/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatClock } from "@/lib/exam/timer";
import type { ClientQuestion } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { QuestionCard } from "./question-card";

interface MockRunnerProps {
  sessionId: string;
  mockTitle: string;
  sectionIndex: number;
  totalSections: number;
  section: {
    skill: string;
    label: string;
    durationSeconds: number;
    remainingSeconds: number;
    started: boolean;
    questions: ClientQuestion[];
    answered: { refId: string; selectedAnswer: string | null }[];
  };
}

export function MockRunner({
  sessionId,
  mockTitle,
  sectionIndex,
  totalSections,
  section,
}: MockRunnerProps) {
  const router = useRouter();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(
    Object.fromEntries(section.answered.map((a) => [a.refId, a.selectedAnswer])),
  );
  const [remaining, setRemaining] = useState(section.remainingSeconds);
  const [, startTx] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(Date.now());
  const finishedRef = useRef(false);

  // server-authoritative snapshot; count down locally from it
  useEffect(() => {
    if (!section.started) return;
    const base = section.remainingSeconds;
    const id = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedRef.current) / 1000);
      const left = Math.max(0, base - elapsed);
      setRemaining(left);
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        finishSection(true);
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.started, section.remainingSeconds]);

  const beginSection = () => {
    startTx(async () => {
      await startMockSectionAction(sessionId);
      router.refresh();
    });
  };

  const finishSection = (expired = false) => {
    setFinishing(true);
    startTx(async () => {
      if (expired) toast("Temps écoulé — passage à la suite.", "info");
      const res = await advanceMock(sessionId);
      if (res.done && res.attemptId) router.push(`/attempts/${res.attemptId}/results`);
      else router.refresh();
    });
  };

  const onSelect = (refId: string, optionId: string) => {
    setAnswers((a) => ({ ...a, [refId]: optionId }));
    const responseMs = Date.now() - startedRef.current;
    startTx(async () => {
      try {
        await answerMock(sessionId, { refId, selectedAnswer: optionId, responseMs });
      } catch {
        toast("Enregistrement impossible.", "error");
      }
    });
  };

  // ── section start gate ──
  if (!section.started) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card className="p-8 text-center" raised>
          <Badge variant="navy" className="mx-auto">
            {mockTitle} · Section {sectionIndex + 1}/{totalSections}
          </Badge>
          <h1 className="display mt-4 text-2xl">{section.label}</h1>
          <p className="mt-2 text-sm text-muted">
            {section.questions.length} questions · {Math.round(section.durationSeconds / 60)}{" "}
            minutes.
            {section.skill === "listening"
              ? " Chaque audio se joue un nombre limité de fois, comme à l'examen."
              : ""}
          </p>
          <p className="mt-3 text-xs text-faint">
            Le chronomètre démarre dès que vous commencez et ne se réinitialise pas si vous
            rechargez la page.
          </p>
          <Button variant="primary" className="mt-6" onClick={beginSection}>
            Commencer la section
          </Button>
        </Card>
      </div>
    );
  }

  const q = section.questions[index]!;
  const answeredCount = Object.values(answers).filter((v) => v != null).length;
  const low = remaining <= 60;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:py-6">
      {/* sticky exam bar */}
      <div className="sticky top-14 z-10 mb-4 flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-canvas/90 px-4 py-2.5 backdrop-blur">
        <div className="text-sm">
          <span className="font-medium">{section.label}</span>
          <span className="text-muted">
            {" "}
            · {answeredCount}/{section.questions.length}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums",
            low ? "text-danger" : "text-ink",
          )}
          role="timer"
          aria-live="off"
        >
          {low && <AlertTriangle className="h-4 w-4" />}
          <Clock className="h-4 w-4" />
          {formatClock(remaining)}
        </div>
      </div>

      <QuestionCard
        q={q}
        index={index}
        total={section.questions.length}
        selected={answers[q.refId] ?? null}
        locked={false}
        onSelect={(opt) => onSelect(q.refId, opt)}
        allowTranscript={false}
        audioMaxPlays={section.skill === "listening" ? 2 : undefined}
      />

      <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Navigation des questions">
        {section.questions.map((qq, i) => (
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
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        {index < section.questions.length - 1 ? (
          <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" onClick={() => finishSection(false)} disabled={finishing}>
            {finishing
              ? "…"
              : sectionIndex + 1 < totalSections
                ? "Section suivante"
                : "Terminer l'examen"}
          </Button>
        )}
      </div>

      {answeredCount < section.questions.length && index === section.questions.length - 1 && (
        <p className="mt-3 text-center text-xs text-muted">
          {section.questions.length - answeredCount} question(s) sans réponse.
        </p>
      )}
    </div>
  );
}
