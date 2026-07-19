"use client";
import { reportIssue } from "@/app/(app)/practice/content-actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { X } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * Thin "Private Beta" strip + a lightweight feedback entry. Deliberately NOT a modal:
 * the strip is static at the top and the feedback panel is a dismissible corner card, so it
 * never covers a core action. Hidden entirely when NEXT_PUBLIC_BETA === "false".
 */
export function BetaBar() {
  if (process.env.NEXT_PUBLIC_BETA === "false") return null;
  return <BetaBarInner />;
}

function BetaBarInner() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const send = () => {
    const text = message.trim();
    if (!text) return;
    start(async () => {
      try {
        await reportIssue({
          refType: "beta",
          refId: "feedback",
          category: "beta_feedback",
          message: text,
        });
        toast("Merci ! Votre retour a bien été envoyé.", "success");
        setOpen(false);
        setMessage("");
      } catch {
        toast("Envoi impossible pour le moment.", "error");
      }
    });
  };

  return (
    <>
      <div className="w-full bg-navy text-on-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-xs sm:text-[0.8rem]">
          <span className="font-semibold tracking-wide">Private Beta</span>
          <span className="hidden text-on-navy/75 sm:inline">
            · résultats non officiels, estimations d'entraînement
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="ml-1 rounded-full bg-white/15 px-2.5 py-0.5 font-medium hover:bg-white/25"
          >
            Donner mon avis
          </button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Retour sur la Beta"
          className="card card-raised fixed bottom-4 right-4 z-[70] w-[min(20rem,calc(100vw-2rem))] p-4"
        >
          <div className="flex items-start justify-between">
            <div className="text-sm font-semibold">Votre avis sur la Beta</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Qu'est-ce qui a bien fonctionné ? Qu'est-ce qui vous a bloqué ?
          </p>
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre retour…"
            aria-label="Votre retour"
            className="mt-2 text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={send}
              disabled={pending || !message.trim()}
            >
              {pending ? "Envoi…" : "Envoyer"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
