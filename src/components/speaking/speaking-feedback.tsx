"use client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import type { SpeakingAnalysis } from "@/lib/speaking/analyze";
import { useState } from "react";

export function SpeakingFeedback({
  analysis,
  modelOutlineFr,
}: {
  analysis: SpeakingAnalysis;
  modelOutlineFr?: string;
}) {
  const [showModel, setShowModel] = useState(false);
  return (
    <div className="space-y-4">
      <Card className="p-5" raised>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Estimation locale</h2>
          <Badge variant="warning">Non officiel</Badge>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-semibold text-navy tabular-nums">
            {analysis.estimatedBand}
          </span>
          <span className="pb-1 text-sm text-muted">/ 20</span>
        </div>
        <p className="mt-2 text-sm text-ink">{analysis.summaryFr}</p>
      </Card>

      <div className="space-y-3">
        {analysis.criteria.map((c) => (
          <Card key={c.key} className="p-4">
            <Meter
              value={c.score / 100}
              label={c.labelFr}
              tone={c.score < 50 ? "accent" : c.score < 75 ? "gold" : "success"}
              showValue
            />
            <p className="mt-2 text-sm text-muted">{c.detailFr}</p>
          </Card>
        ))}
      </div>

      {modelOutlineFr && (
        <Card className="p-4">
          <button
            type="button"
            onClick={() => setShowModel((s) => !s)}
            className="text-sm font-medium text-navy hover:underline"
          >
            {showModel ? "Masquer le plan modèle" : "Voir un plan de réponse modèle"}
          </button>
          {showModel && (
            <p className="mt-3 whitespace-pre-line rounded-[var(--radius-sm)] bg-surface-2 p-4 text-sm leading-relaxed text-ink">
              {modelOutlineFr}
            </p>
          )}
        </Card>
      )}

      <Alert tone="neutral">{analysis.disclaimerFr}</Alert>
    </div>
  );
}
