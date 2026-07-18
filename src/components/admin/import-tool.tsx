"use client";
import { type ImportResult, importContent } from "@/app/(app)/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";

const SAMPLE = `[
  {
    "id": "reading_b1_9001",
    "slug": "reading-b1-9001",
    "skill": "reading",
    "subtype": "correspondence",
    "topic": "travail",
    "cefrLevel": "B1",
    "targetNclc": 6,
    "stem": "Que demande l'auteur du courriel ?",
    "options": [
      { "id": "a", "text": "Un rendez-vous la semaine prochaine." },
      { "id": "b", "text": "Un remboursement immédiat." },
      { "id": "c", "text": "Une lettre de recommandation." },
      { "id": "d", "text": "Un changement d'horaire." }
    ],
    "correctAnswer": "a",
    "explanation": "L'auteur propose de se rencontrer la semaine prochaine.",
    "distractorRationales": {
      "b": "Aucun remboursement n'est évoqué.",
      "c": "La lettre n'est pas mentionnée.",
      "d": "L'horaire n'est pas le sujet."
    },
    "vocabulary": [],
    "estimatedSeconds": 60,
    "difficultyEvidence": "Compréhension d'une intention explicite dans un courriel courant.",
    "author": "Admin",
    "passage": { "title": "Courriel", "text": "Bonjour, seriez-vous disponible la semaine prochaine pour un rendez-vous ? Merci." }
  }
]`;

export function ImportTool() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  const run = (commit: boolean) => {
    start(async () => {
      const res = await importContent(json, commit);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Collez un tableau JSON de questions de lecture. La validation est atomique : si un seul
        élément est invalide, rien n'est importé.
      </p>
      <Textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={12}
        placeholder="[ … ]"
        aria-label="Contenu JSON à importer"
        className="font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setJson(SAMPLE)}>
          Insérer un exemple
        </Button>
        <Button variant="subtle" onClick={() => run(false)} disabled={pending || !json.trim()}>
          Valider (aperçu)
        </Button>
        <Button variant="primary" onClick={() => run(true)} disabled={pending || !json.trim()}>
          {pending ? "…" : "Importer"}
        </Button>
      </div>

      {result && (
        <div className="space-y-2">
          {result.ok ? (
            <Alert tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
              {result.inserted > 0
                ? `${result.inserted} question(s) importée(s).`
                : `${result.valid}/${result.total} valides — prêtes à importer.`}
            </Alert>
          ) : (
            <Alert tone="danger" icon={<XCircle className="h-4 w-4" />}>
              {result.errors.length} erreur(s) — rien n'a été importé.
            </Alert>
          )}
          {result.errors.length > 0 && (
            <ul className="space-y-1 rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3 text-sm">
              {result.errors.map((e, i) => (
                <li key={i} className="text-danger">
                  {e.index >= 0 ? `Élément ${e.index}` : (e.id ?? "Lot")} : {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
