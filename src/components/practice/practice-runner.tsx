"use client";
import { saveAnswer, submitPractice } from "@/app/(app)/practice/actions";
import { toggleBookmark } from "@/app/(app)/practice/content-actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import type { ClientQuestion } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";
import { BookmarkPlus, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { type Feedback, QuestionCard } from "./question-card";
import { ReportProblem } from "./report-problem";

interface AnswerState {
  selected: string | null;
  feedback?: Feedback | null;
}

interface PracticeRunnerProps {
  sessionId: string;
  questions: ClientQuestion[];
  initial: Record<string, AnswerState>;
  instantFeedback: boolean;
  bookmarked: string[];
  title: string;
}

export function PracticeRunner({
  sessionId,
  questions,
  initial,
  instantFeedback,
  bookmarked,
  title,
}: PracticeRunnerProps) {
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initial);
  const [marks, setMarks] = useState<Set<string>>(new Set(bookmarked));
  const [pending, startTransition] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const startedAt = useRef(Date.now());

  const q = questions[index]!;
  const state = answers[q.refId] ?? { selected: null };
  const answeredCount = Object.values(answers).filter((a) => a.selected != null).length;
  const isLast = index === questions.length - 1;

  const onSelect = (optionId: string) => {
    if (state.feedback) return; // already revealed in learning mode
    const responseMs = Date.now() - startedAt.current;
    setAnswers((a) => ({ ...a, [q.refId]: { selected: optionId } }));
    startTransition(async () => {
      try {
        const res = await saveAnswer(sessionId, {
          refId: q.refId,
          selectedAnswer: optionId,
          responseMs,
        });
        setAnswers((a) => ({
          ...a,
          [q.refId]: { selected: optionId, feedback: res.feedback ?? null },
        }));
      } catch {
        toast("Enregistrement impossible. Réessayez.", "error");
      }
    });
  };

  const go = (next: number) => {
    if (next < 0 || next >= questions.length) return;
    setIndex(next);
    startedAt.current = Date.now();
  };

  const onSubmit = () => {
    startSubmit(async () => {
      try {
        await submitPractice(sessionId);
      } catch {
        toast("Échec de la soumission.", "error");
      }
    });
  };

  const onBookmark = () => {
    const wasMarked = marks.has(q.refId);
    setMarks((m) => {
      const next = new Set(m);
      wasMarked ? next.delete(q.refId) : next.add(q.refId);
      return next;
    });
    startTransition(async () => {
      try {
        const res = await toggleBookmark(q.refId);
        toast(res.bookmarked ? "Ajouté aux favoris" : "Retiré des favoris", "success");
      } catch {
        toast("Action impossible.", "error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-muted">{title}</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onBookmark}
              aria-pressed={marks.has(q.refId)}
              aria-label="Favori"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2",
                marks.has(q.refId) ? "text-gold" : "text-muted",
              )}
            >
              <BookmarkPlus className="h-[18px] w-[18px]" />
            </button>
            <ReportProblem refId={q.refId} />
          </div>
        </div>
        <Meter value={answeredCount / questions.length} tone="navy" />
      </div>

      <QuestionCard
        q={q}
        index={index}
        total={questions.length}
        selected={state.selected}
        feedback={state.feedback}
        locked={instantFeedback && !!state.feedback}
        onSelect={onSelect}
        allowTranscript={instantFeedback}
      />

      {/* navigator dots */}
      <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Navigation des questions">
        {questions.map((qq, i) => {
          const a = answers[qq.refId];
          const done = a?.selected != null;
          return (
            <button
              key={qq.refId}
              type="button"
              onClick={() => go(i)}
              aria-label={`Question ${i + 1}${done ? " (répondue)" : ""}`}
              aria-current={i === index}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i === index ? "ring-2 ring-navy ring-offset-2 ring-offset-canvas" : "",
                done ? "bg-navy" : "bg-surface-3",
              )}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        {isLast ? (
          <Button variant="primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Analyse…" : "Terminer la séance"}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => go(index + 1)} disabled={pending}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {answeredCount === questions.length && !isLast && (
        <div className="mt-4 text-center">
          <Button variant="accent" onClick={onSubmit} disabled={submitting}>
            <Flag className="h-4 w-4" /> {submitting ? "Analyse…" : "Terminer maintenant"}
          </Button>
        </div>
      )}
    </div>
  );
}
