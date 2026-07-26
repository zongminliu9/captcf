"use client";
import { submitPriceIntent } from "@/app/(marketing)/pricing/intent-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import type { PriceVariant } from "@/lib/pricing/experiment";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState, useTransition } from "react";

const WILLINGNESS: [string, string][] = [
  ["yes", "Oui, à ce prix"],
  ["maybe", "Peut-être"],
  ["no", "Non"],
];
const MODEL: [string, string][] = [
  ["one_time", "Paiement unique"],
  ["monthly", "Abonnement mensuel"],
  ["no_preference", "Peu importe"],
];
const BANDS: [string, string][] = [
  ["lt_30", "moins de 30 ¥"],
  ["30_60", "30–60 ¥"],
  ["60_120", "60–120 ¥"],
  ["gt_120", "plus de 120 ¥"],
  ["free_only", "gratuit seulement"],
];
const REASONS: [string, string][] = [
  ["full_mock_exams", "Examens blancs complets"],
  ["mistake_notebook", "Carnet d'erreurs"],
  ["audio_quality", "Qualité de l'audio"],
  ["explanations", "Explications détaillées"],
  ["study_plan", "Plan d'étude"],
  ["price", "Le prix"],
];
const BLOCKERS: [string, string][] = [
  ["content_not_complete", "Banque pas assez complète"],
  ["audio_not_human", "Audio pas encore humain"],
  ["unsure_accuracy", "Doute sur la fiabilité"],
  ["too_expensive", "Trop cher"],
  ["prefer_free", "Je préfère le gratuit"],
  ["trust_new_product", "Produit trop récent"],
];

function Chips({
  options,
  value,
  onChange,
  name,
}: {
  options: [string, string][];
  value: string | null;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition",
            value === k
              ? "border-navy bg-navy-50 font-medium text-navy"
              : "border-border-strong text-muted hover:bg-surface-2",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Price-intent survey. Records what people SAY — no charge, no countdown, no fake scarcity.
 * Everything after the first question is optional and the whole thing is skippable.
 */
export function PriceIntent({ variant }: { variant: PriceVariant }) {
  const [willingness, setWillingness] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (skipped) return null;

  if (done) {
    return (
      <Card className="mt-8 p-5">
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="h-4 w-4" /> Merci ! Votre réponse nous aide à fixer un prix juste.
        </p>
      </Card>
    );
  }

  const send = () => {
    if (!willingness) return;
    start(async () => {
      const r = await submitPriceIntent({
        variantId: variant.id,
        willingness: willingness as "yes" | "maybe" | "no",
        modelPreference: (model ?? "no_preference") as never,
        priceBand: (band ?? null) as never,
        reason,
        blocker,
        comment,
      });
      if (r.ok) setDone(true);
      else setError(r.message);
    });
  };

  return (
    <Card className="mt-8 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Aidez-nous à fixer le prix</h2>
      <p className="mt-1 text-sm text-muted">
        Nous testons un tarif d'accès anticipé à <strong>{variant.display}</strong> ({variant.label}
        ). <strong>Aucun paiement n'est encaissé</strong> pendant la Beta — nous recueillons
        seulement votre avis.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1.5 text-sm font-medium">
            À {variant.display}, achèteriez-vous CapTCF ?
          </div>
          <Chips
            options={WILLINGNESS}
            value={willingness}
            onChange={setWillingness}
            name="Intention d'achat"
          />
        </div>

        {willingness && (
          <>
            <div>
              <div className="mb-1.5 text-sm font-medium">Vous préférez… (facultatif)</div>
              <Chips options={MODEL} value={model} onChange={setModel} name="Modèle" />
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium">
                Quel prix vous semble acceptable ? (facultatif)
              </div>
              <Chips options={BANDS} value={band} onChange={setBand} name="Fourchette de prix" />
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium">
                {willingness === "no"
                  ? "Qu'est-ce qui vous en empêche surtout ? (facultatif)"
                  : "Qu'est-ce qui compte le plus pour vous ? (facultatif)"}
              </div>
              {willingness === "no" ? (
                <Chips options={BLOCKERS} value={blocker} onChange={setBlocker} name="Frein" />
              ) : (
                <Chips options={REASONS} value={reason} onChange={setReason} name="Raison" />
              )}
            </div>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Un commentaire ? (facultatif)"
              aria-label="Commentaire"
              className="text-sm"
            />
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={send} disabled={!willingness || pending}>
            {pending ? "Envoi…" : "Envoyer ma réponse"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSkipped(true)} disabled={pending}>
            Passer
          </Button>
        </div>
      </div>
    </Card>
  );
}
