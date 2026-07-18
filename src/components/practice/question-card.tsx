"use client";
import { Check, FileText, Volume2, X } from "lucide-react";
import { useState } from "react";
import { Badge, cefrVariant } from "@/components/ui/badge";
import type { ClientQuestion } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";

export interface Feedback {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  distractorRationales: Record<string, string>;
  transcript: string | null;
}

interface QuestionCardProps {
  q: ClientQuestion;
  index: number;
  total: number;
  selected: string | null;
  feedback?: Feedback | null;
  locked: boolean;
  onSelect: (optionId: string) => void;
  audioMaxPlays?: number;
  allowTranscript?: boolean;
}

export function QuestionCard({
  q,
  index,
  total,
  selected,
  feedback,
  locked,
  onSelect,
  audioMaxPlays,
  allowTranscript = true,
}: QuestionCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const revealed = !!feedback;

  return (
    <div className="rise-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted">
            {index + 1} / {total}
          </span>
          <Badge variant={cefrVariant(q.cefrLevel)} size="sm">
            {q.cefrLevel}
          </Badge>
        </div>
        <span className="text-xs text-faint">{q.skill === "listening" ? "Écoute" : "Lecture"}</span>
      </div>

      {/* stimulus */}
      {q.stimulus.kind === "audio" ? (
        <div className="mb-4">
          <p className="mb-2 flex items-start gap-2 text-sm text-muted">
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0" />
            {q.stimulus.context}
          </p>
          {q.stimulus.audioFile ? (
            <AudioPlayer
              src={q.stimulus.audioFile}
              durationSeconds={q.stimulus.audioDuration}
              maxPlays={audioMaxPlays}
              allowSpeed={allowTranscript}
              allowScrub={allowTranscript}
            />
          ) : (
            <p className="text-sm text-danger">Audio indisponible.</p>
          )}
        </div>
      ) : (
        <div className="mb-4 max-h-[42vh] overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-surface-2 p-4 leading-relaxed sm:max-h-none">
          {q.stimulus.title && <h3 className="mb-2 font-semibold">{q.stimulus.title}</h3>}
          <p className="whitespace-pre-line text-[0.97rem] text-ink">{q.stimulus.text}</p>
        </div>
      )}

      {/* stem */}
      <p className="mb-4 text-lg font-medium leading-snug">{q.stem}</p>

      {/* options */}
      <div className="space-y-2.5" role="radiogroup" aria-label="Réponses">
        {q.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = revealed && feedback!.correctAnswer === opt.id;
          const isWrongPick = revealed && isSelected && !feedback!.correct;
          return (
            <div key={opt.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={locked}
                onClick={() => !locked && onSelect(opt.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left text-[0.97rem] transition-colors",
                  !revealed && isSelected && "border-navy bg-navy-50",
                  !revealed && !isSelected && "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
                  isCorrect && "border-success bg-success-50",
                  isWrongPick && "border-danger bg-danger-50",
                  revealed && !isCorrect && !isWrongPick && "border-border bg-surface opacity-70",
                  locked && !revealed && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isCorrect && "bg-success text-white",
                    isWrongPick && "bg-danger text-white",
                    !revealed && isSelected && "bg-navy text-on-navy",
                    !revealed && !isSelected && "bg-surface-3 text-muted",
                    revealed && !isCorrect && !isWrongPick && "bg-surface-3 text-muted",
                  )}
                >
                  {isCorrect ? (
                    <Check className="h-4 w-4" />
                  ) : isWrongPick ? (
                    <X className="h-4 w-4" />
                  ) : (
                    opt.id.toUpperCase()
                  )}
                </span>
                <span className="flex-1">{opt.text}</span>
              </button>
              {revealed && !isCorrect && feedback!.distractorRationales[opt.id] && (
                <p className="mt-1 pl-11 text-xs leading-relaxed text-muted">
                  {feedback!.distractorRationales[opt.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* feedback panel */}
      {revealed && (
        <div className="rise-in mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-2 p-4">
          <div
            className={cn(
              "mb-2 flex items-center gap-2 text-sm font-semibold",
              feedback!.correct ? "text-success" : "text-danger",
            )}
          >
            {feedback!.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {feedback!.correct ? "Correct" : "Incorrect"}
          </div>
          <p className="text-sm leading-relaxed text-ink">{feedback!.explanation}</p>
          {allowTranscript && feedback!.transcript && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
              >
                <FileText className="h-4 w-4" />
                {showTranscript ? "Masquer la transcription" : "Voir la transcription"}
              </button>
              {showTranscript && (
                <p className="mt-2 whitespace-pre-line rounded-[var(--radius-sm)] bg-surface p-3 text-sm leading-relaxed text-muted">
                  {feedback!.transcript}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
