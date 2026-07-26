"use client";
import {
  approveRecording,
  rejectRecording,
  requestRerecord,
  rollbackRecording,
  uploadRecordings,
} from "@/app/(app)/admin/recording-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { useRef, useState, useTransition } from "react";

export interface RecordingRow {
  id: string;
  cefr: string;
  topic: string;
  sourceType: string;
  publishState: string;
  speaker: string | null;
  version: number;
  qaStatus: string | null;
  qaNotes: string | null;
  durationMs: number | null;
  lufs: number | null;
  peak: number | null;
  file: string | null;
  official: boolean;
}

function stateTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  if (s === "awaiting_qa") return "warning";
  return "neutral";
}

export function RecordingQueue({
  rows,
  shown,
  total,
}: {
  rows: RecordingRow[];
  shown: number;
  total: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null);
  const [reviewer, setReviewer] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const onUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const r = await uploadRecordings(fd);
        const bad = r.failed.length;
        setMsg({
          ok: r.stored.length > 0,
          text: `${r.stored.length} importé(s), ${bad} rejeté(s) — non apparié ${r.plan.unmatched}, doublon ${r.plan.duplicates}, format ${r.plan.unsupported}.`,
          details: r.failed.slice(0, 8).map((f) => `${f.filename} — ${f.reason}`),
        });
        formRef.current?.reset();
      } catch (err) {
        setMsg({ ok: false, text: `Échec de l'import : ${(err as Error).message}` });
      }
    });
  };

  const act = (fn: () => Promise<{ ok: boolean; message: string; failures?: string[] }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message, details: r.failures });
    });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Importer des enregistrements humains</h2>
        <p className="mb-3 text-sm text-muted">
          Nommez chaque fichier avec l'identifiant de la question (ex.{" "}
          <code>listening_b2_0007.wav</code>). Le master WAV est requis pour la QA technique ; les
          fichiers non appariés sont mis en quarantaine sans créer d'enregistrement.
        </p>
        <form ref={formRef} onSubmit={onUpload} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Provenance</span>
              <select
                name="sourceType"
                className="h-11 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
              >
                <option value="human_original">human_original (enregistrement original)</option>
                <option value="human_licensed">human_licensed (sous licence)</option>
              </select>
            </label>
            <Input
              name="speakerName"
              placeholder="Nom du/de la locuteur·rice"
              aria-label="Locuteur"
            />
            <Input
              name="speakerRegion"
              placeholder="Région / accent (ex. Québec)"
              aria-label="Région"
            />
            <Input
              name="recordingSession"
              placeholder="Session (ex. 2026-08-A)"
              aria-label="Session"
            />
            <Input
              name="licenseName"
              placeholder="Licence (si human_licensed)"
              aria-label="Licence"
            />
            <Input name="licenseUrl" placeholder="URL de la licence" aria-label="URL licence" />
          </div>
          <input
            type="file"
            name="files"
            multiple
            accept=".wav,.m4a,.mp4,.aac,.opus,.ogg,.webm"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:text-on-navy"
          />
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Import…" : "Importer le lot"}
          </Button>
        </form>
      </Card>

      {msg && (
        <div
          className={`rounded-[var(--radius-sm)] border p-3 text-sm ${
            msg.ok
              ? "border-success/30 bg-success-50 text-success"
              : "border-danger/30 bg-danger-50 text-danger"
          }`}
          role="status"
        >
          {msg.text}
          {msg.details?.length ? (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {msg.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Votre nom (réviseur QA)"
          aria-label="Réviseur QA"
          className="max-w-xs"
        />
        <span className="text-xs text-muted">
          {shown} affiché(s) sur {total}
        </span>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted">Aucun élément pour ce filtre.</p>}
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{r.id}</span>
              <Badge size="sm" variant="outline">
                {r.cefr}
              </Badge>
              <Badge size="sm" variant={stateTone(r.publishState)}>
                {r.publishState}
              </Badge>
              <Badge size="sm" variant={r.sourceType === "prototype_tts" ? "warning" : "navy"}>
                {r.sourceType}
              </Badge>
              {r.official && (
                <Badge size="sm" variant="success">
                  officiel
                </Badge>
              )}
              {r.version > 0 && <span className="text-xs text-faint">v{r.version}</span>}
              <span className="ml-auto text-xs text-faint">{r.topic}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              {r.durationMs ? <span>{(r.durationMs / 1000).toFixed(1)} s</span> : null}
              {r.lufs != null ? <span>{r.lufs.toFixed(1)} LUFS</span> : null}
              {r.peak != null ? <span>peak {r.peak.toFixed(1)} dB</span> : null}
              {r.speaker ? <span>🎙 {r.speaker}</span> : null}
              {r.qaStatus ? <span>QA: {r.qaStatus}</span> : null}
            </div>
            {r.qaNotes && <p className="mt-1 text-xs text-danger">{r.qaNotes}</p>}

            {r.file && (
              // biome-ignore lint/a11y/useMediaCaption: admin audition of a raw clip; transcript is on the question
              <audio src={r.file} controls preload="none" className="mt-2 h-9 w-full max-w-md" />
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={pending || r.sourceType === "prototype_tts"}
                onClick={() => act(() => approveRecording(r.id, reviewer, ""))}
              >
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => act(() => requestRerecord(r.id, "à réenregistrer"))}
              >
                Réenregistrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => act(() => rejectRecording(r.id, reviewer, "rejeté en QA"))}
              >
                Rejeter
              </Button>
              {r.publishState === "approved" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => act(() => rollbackRecording(r.id, "rollback"))}
                >
                  Rollback
                </Button>
              )}
              <a
                href={`/api/admin/recording-packet?id=${r.id}`}
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-border-strong px-3 text-sm hover:bg-surface-2"
              >
                Packet
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
