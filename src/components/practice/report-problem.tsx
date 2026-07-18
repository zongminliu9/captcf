"use client";
import { reportIssue } from "@/app/(app)/practice/content-actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";

const CATEGORIES = [
  ["wrong_answer", "Réponse erronée"],
  ["typo", "Faute / coquille"],
  ["audio", "Problème audio"],
  ["unclear", "Peu clair / ambigu"],
  ["other", "Autre"],
] as const;

/** Lets a learner flag a content problem → feeds the admin reports workflow. */
export function ReportProblem({
  refId,
  refType = "question",
}: { refId: string; refType?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("wrong_answer");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const submit = () => {
    start(async () => {
      try {
        await reportIssue({
          refType,
          refId,
          category,
          message: message || CATEGORIES.find((c) => c[0] === category)![1],
        });
        toast("Merci, votre signalement a été envoyé.", "success");
        setOpen(false);
        setMessage("");
      } catch {
        toast("Envoi impossible.", "error");
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Signaler un problème"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
      >
        <TriangleAlert className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="card card-raised absolute right-0 z-50 mt-1 w-72 p-3">
          <div className="mb-2 text-sm font-medium">Signaler un problème</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  category === value
                    ? "border-navy bg-navy-50 text-navy"
                    : "border-border-strong text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Détails (facultatif)…"
            aria-label="Détails du signalement"
            className="text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" variant="primary" onClick={submit} disabled={pending}>
              {pending ? "…" : "Envoyer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
