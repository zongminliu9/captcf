import { RecordingQueue } from "@/components/admin/recording-queue";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { audioAssets, questions } from "@/db/schema";
import { isOfficialAudio } from "@/lib/audio/gating";
import { and, asc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATES = [
  "all",
  "awaiting_recording",
  "awaiting_qa",
  "approved",
  "rejected",
  "prototype",
] as const;

export default async function AdminRecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; cefr?: string }>;
}) {
  const sp = await searchParams;
  const state = (sp.state ?? "awaiting_recording") as (typeof STATES)[number];
  const cefr = sp.cefr ?? "all";

  const conds = [eq(questions.skill, "listening")];
  if (cefr !== "all") conds.push(eq(questions.cefrLevel, cefr));

  const rows = await db
    .select({
      id: questions.id,
      cefr: questions.cefrLevel,
      topic: questions.topic,
      status: questions.status,
      sourceType: audioAssets.sourceType,
      publishState: audioAssets.publishState,
      speaker: audioAssets.speakerName,
      version: audioAssets.version,
      qaStatus: audioAssets.qaStatus,
      qaNotes: audioAssets.qaNotes,
      durationMs: audioAssets.durationMs,
      lufs: audioAssets.loudnessLufs,
      peak: audioAssets.truePeakDb,
      file: audioAssets.file,
    })
    .from(questions)
    .leftJoin(audioAssets, eq(audioAssets.id, questions.audioId))
    .where(and(...conds))
    .orderBy(asc(questions.cefrLevel), asc(questions.id))
    .limit(400);

  const filtered = rows.filter((r) => {
    const src = r.sourceType ?? "prototype_tts";
    const ps = r.publishState ?? "draft";
    if (state === "all") return true;
    if (state === "prototype") return src === "prototype_tts";
    if (state === "awaiting_recording")
      return src === "prototype_tts" || ps === "awaiting_recording";
    return ps === state;
  });

  const [tally] = await db
    .select({
      total: sql<number>`count(*)::int`,
      human: sql<number>`count(*) FILTER (WHERE ${audioAssets.sourceType} IN ('human_original','human_licensed'))::int`,
      approved: sql<number>`count(*) FILTER (WHERE ${audioAssets.publishState} = 'approved')::int`,
      awaitingQa: sql<number>`count(*) FILTER (WHERE ${audioAssets.publishState} = 'awaiting_qa')::int`,
    })
    .from(audioAssets);

  const officialCount = rows.filter((r) =>
    isOfficialAudio({ sourceType: r.sourceType, publishState: r.publishState }),
  ).length;
  const needed = rows.length - officialCount;
  const ephemeral = (process.env.STORAGE_DRIVER ?? "local") === "local";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Clips au total", value: tally?.total ?? 0 },
          { label: "Voix humaine", value: tally?.human ?? 0 },
          { label: "Approuvés (officiels)", value: tally?.approved ?? 0 },
          { label: "En attente de QA", value: tally?.awaitingQa ?? 0 },
        ].map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-2xl font-semibold text-navy tabular-nums">{t.value}</div>
            <div className="mt-1 text-sm text-muted">{t.label}</div>
          </Card>
        ))}
      </div>

      <Alert tone={officialCount === 0 ? "warning" : "neutral"}>
        <strong>{needed}</strong> enregistrement(s) humain(s) encore nécessaires sur cette vue —{" "}
        <strong>{officialCount}</strong> approuvé(s). Tant qu'un clip n'est pas
        <code className="mx-1 rounded bg-surface-2 px-1">human_*</code>+
        <code className="mx-1 rounded bg-surface-2 px-1">approved</code>, il n'est jamais servi
        comme matériel officiel — l'audio TTS reste étiqueté « prototype » côté candidat.
      </Alert>

      {ephemeral && (
        <Alert tone="warning">
          <strong>Stockage local (éphémère).</strong> <code>STORAGE_DRIVER=local</code> : sur Render
          sans disque persistant, les fichiers téléversés disparaissent au prochain déploiement.
          Configurez un disque persistant ou un pilote S3/R2 avant une campagne d'enregistrement.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">État :</span>
        {STATES.map((s) => (
          <a
            key={s}
            href={`/admin/recordings?state=${s}&cefr=${cefr}`}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              s === state ? "border-navy bg-navy-50 text-navy" : "border-border-strong text-muted"
            }`}
          >
            {s}
          </a>
        ))}
        <span className="ml-3 text-sm text-muted">CEFR :</span>
        {["all", "A1", "A2", "B1", "B2", "C1", "C2"].map((c) => (
          <a
            key={c}
            href={`/admin/recordings?state=${state}&cefr=${c}`}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              c === cefr ? "border-navy bg-navy-50 text-navy" : "border-border-strong text-muted"
            }`}
          >
            {c}
          </a>
        ))}
        <a
          href="/api/admin/recording-manifest"
          className="ml-auto rounded-[var(--radius-sm)] border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
        >
          ⬇ Manifest CSV
        </a>
      </div>

      <RecordingQueue
        rows={filtered.slice(0, 120).map((r) => ({
          id: r.id,
          cefr: r.cefr,
          topic: r.topic,
          sourceType: r.sourceType ?? "prototype_tts",
          publishState: r.publishState ?? "draft",
          speaker: r.speaker,
          version: r.version ?? 0,
          qaStatus: r.qaStatus,
          qaNotes: r.qaNotes,
          durationMs: r.durationMs,
          lufs: r.lufs ? Number(r.lufs) : null,
          peak: r.peak ? Number(r.peak) : null,
          file: r.file,
          official: isOfficialAudio({ sourceType: r.sourceType, publishState: r.publishState }),
        }))}
        shown={Math.min(filtered.length, 120)}
        total={filtered.length}
      />

      <p className="text-xs text-faint">
        Les paquets d'enregistrement se trouvent dans <code>content/recording-packets/</code> ; le
        guide technique complet est dans <code>docs/AUDIO_RECORDING_GUIDE.md</code>.
      </p>
    </div>
  );
}
