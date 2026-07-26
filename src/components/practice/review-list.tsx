"use client";
import { Badge, cefrVariant } from "@/components/ui/badge";
import type { FullQuestion } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { QuestionCard } from "./question-card";

/** Mistake-notebook metadata — present when the list is rendered as the carnet d'erreurs. */
export interface MistakeMeta {
  wrongCount: number;
  correctStreak: number;
  mastered: boolean;
  masteryStreakTarget: number;
  firstWrongAt: string;
  lastWrongAt: string;
  lastSeenAt: string;
  dueAt: string;
  addedReason: string;
}

export interface ReviewEntry {
  question: FullQuestion;
  selected: string | null;
  correct: boolean | null;
  meta?: MistakeMeta;
}

const REASON_LABEL: Record<string, string> = {
  wrong: "réponse incorrecte",
  timeout: "sans réponse (temps écoulé)",
  repeated: "erreur répétée",
  unsure: "marquée « pas sûr »",
};

export function ReviewList({ entries }: { entries: ReviewEntry[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {entries.map((e, i) => {
        const isOpen = open.has(e.question.refId);
        const status = e.correct === true ? "correct" : e.selected == null ? "skipped" : "wrong";
        return (
          <div key={e.question.refId} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(e.question.refId)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-2"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  status === "correct" && "bg-success text-white",
                  status === "wrong" && "bg-danger text-white",
                  status === "skipped" && "bg-surface-3 text-muted",
                )}
              >
                {status === "correct" ? (
                  <Check className="h-4 w-4" />
                ) : status === "wrong" ? (
                  <X className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-ink">{e.question.stem}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <Badge variant={cefrVariant(e.question.cefrLevel)} size="sm">
                    {e.question.cefrLevel}
                  </Badge>
                  {e.question.skill === "listening" ? "Écoute" : "Lecture"}
                  {status === "skipped" && " · non répondue"}
                  {e.meta && (
                    <>
                      <span>· {e.meta.wrongCount}× manquée</span>
                      {e.meta.mastered ? (
                        <Badge variant="success" size="sm">
                          maîtrisée
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm">
                          {e.meta.correctStreak}/{e.meta.masteryStreakTarget} correctes
                        </Badge>
                      )}
                    </>
                  )}
                </span>
              </span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-muted transition", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="border-t border-border p-4">
                {e.meta && (
                  <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[var(--radius-sm)] bg-surface-2 p-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-faint">Ajoutée car</dt>
                      <dd className="text-ink">
                        {REASON_LABEL[e.meta.addedReason] ?? e.meta.addedReason}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Première erreur</dt>
                      <dd className="text-ink">{e.meta.firstWrongAt}</dd>
                    </div>
                    <div>
                      <dt className="text-faint">Dernière erreur</dt>
                      <dd className="text-ink">{e.meta.lastWrongAt}</dd>
                    </div>
                    <div>
                      <dt className="text-faint">Dernière révision</dt>
                      <dd className="text-ink">{e.meta.lastSeenAt}</dd>
                    </div>
                    <div>
                      <dt className="text-faint">Prochaine révision</dt>
                      <dd className="text-ink">{e.meta.dueAt}</dd>
                    </div>
                    <div>
                      <dt className="text-faint">Maîtrise</dt>
                      <dd className="text-ink">
                        {e.meta.mastered
                          ? "acquise"
                          : `${e.meta.correctStreak}/${e.meta.masteryStreakTarget} bonnes réponses d'affilée`}
                      </dd>
                    </div>
                  </dl>
                )}
                <QuestionCard
                  q={e.question}
                  index={i}
                  total={entries.length}
                  selected={e.selected}
                  locked
                  onSelect={() => {}}
                  allowTranscript
                  feedback={{
                    correct: e.correct === true,
                    correctAnswer: e.question.correctAnswer,
                    explanation: e.question.explanation,
                    distractorRationales: e.question.distractorRationales,
                    transcript: e.question.transcript,
                  }}
                />
                {e.question.vocabulary.length > 0 && (
                  <div className="mt-4 rounded-[var(--radius-sm)] bg-surface-2 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                      Vocabulaire
                    </div>
                    <ul className="space-y-1 text-sm">
                      {e.question.vocabulary.map((v) => (
                        <li key={v.term} className="flex flex-wrap gap-x-2">
                          <span className="font-medium text-ink">{v.term}</span>
                          <span className="text-muted">— {v.gloss_en}</span>
                          {v.gloss_zh && <span className="text-faint">· {v.gloss_zh}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
