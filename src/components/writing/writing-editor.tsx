"use client";
import { Check, Clock, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveWritingDraft, submitWriting } from "@/app/(app)/writing/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { formatClock } from "@/lib/exam/timer";
import type { WritingAnalysis } from "@/lib/writing/analyze";
import { cn } from "@/lib/utils";
import { WritingFeedback } from "./writing-feedback";

interface WritingEditorProps {
  taskId: string;
  promptFr: string;
  contextFr: string;
  minWords: number;
  maxWords: number;
  suggestedMinutes: number;
  titleFr: string;
  initialText: string;
}

export function WritingEditor(props: WritingEditorProps) {
  const toast = useToast();
  const [text, setText] = useState(props.initialText);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [focusMode, setFocusMode] = useState(false);
  const [feedback, setFeedback] = useState<{ analysis: WritingAnalysis; modelAnswerFr: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const inRange = wordCount >= props.minWords && wordCount <= props.maxWords;

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback(
    async (value: string) => {
      setSaving("saving");
      try {
        await saveWritingDraft(props.taskId, value, Math.round((Date.now() - startRef.current) / 1000));
        setSaving("saved");
      } catch {
        setSaving("idle");
      }
    },
    [props.taskId],
  );

  const onChange = (value: string) => {
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(value), 1400);
  };

  const onSubmit = async () => {
    if (wordCount < 10) {
      toast("Rédigez d'abord votre texte.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitWriting(props.taskId, text, elapsed);
      setFeedback({ analysis: res.analysis, modelAnswerFr: res.modelAnswerFr });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast("Échec de l'analyse.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="display mb-1 text-2xl">Votre analyse</h1>
        <p className="mb-6 text-sm text-muted">{props.titleFr}</p>
        <WritingFeedback analysis={feedback.analysis} modelAnswerFr={feedback.modelAnswerFr} />
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setFeedback(null)}>
            Modifier mon texte
          </Button>
          <Button asChild variant="primary">
            <a href="/writing">Autres tâches</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto px-4 py-6", focusMode ? "max-w-3xl" : "max-w-2xl")}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Badge variant="navy">{props.titleFr}</Badge>
          <button
            type="button"
            onClick={() => setFocusMode((f) => !f)}
            aria-label="Mode concentration"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">{props.contextFr}</p>
        <p className="mt-2 font-medium leading-snug">{props.promptFr}</p>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium tabular-nums",
            inRange ? "text-success" : wordCount > props.maxWords ? "text-danger" : "text-muted",
          )}
        >
          {wordCount} / {props.minWords}–{props.maxWords} mots
        </span>
        <span className="flex items-center gap-3 text-muted">
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="h-3.5 w-3.5" /> {formatClock(elapsed)}
          </span>
          <span className="flex items-center gap-1 text-xs">
            {saving === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
              </>
            ) : saving === "saved" ? (
              <>
                <Check className="h-3 w-3 text-success" /> Enregistré
              </>
            ) : null}
          </span>
        </span>
      </div>

      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={focusMode ? 20 : 14}
        placeholder="Rédigez votre réponse ici…"
        aria-label="Zone de rédaction"
        className="resize-y font-[inherit] text-base leading-relaxed"
      />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">Durée conseillée : {props.suggestedMinutes} min</span>
        <Button variant="primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Analyse…" : "Soumettre pour analyse"}
        </Button>
      </div>
    </div>
  );
}
