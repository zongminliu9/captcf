import { AudioQaControls } from "@/components/admin/audio-qa-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { audioAssets, questions } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TIER_VARIANT: Record<string, "success" | "navy" | "warning" | "danger"> = {
  premium_ready: "success",
  reviewed_tts: "navy",
  prototype_tts: "warning",
  rejected: "danger",
};

export default async function AdminAudioPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const counts = await db
    .select({ quality: audioAssets.quality, n: sql<number>`count(*)::int` })
    .from(audioAssets)
    .groupBy(audioAssets.quality);
  const byTier = Object.fromEntries(counts.map((c) => [c.quality, c.n]));

  const rows = await db
    .select({
      id: audioAssets.id,
      file: audioAssets.file,
      quality: audioAssets.quality,
      qa: audioAssets.qa,
      duration: audioAssets.durationSeconds,
      stem: questions.stem,
      cefr: questions.cefrLevel,
    })
    .from(audioAssets)
    .leftJoin(questions, eq(questions.id, audioAssets.id))
    .where(tier ? eq(audioAssets.quality, tier) : undefined)
    .orderBy(asc(audioAssets.id))
    .limit(60);

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">File d'attente QA audio</h2>
      <p className="mb-4 text-sm text-muted">
        Audio synthétisé (TTS, honnêtement étiqueté). Écoutez, puis validez le palier de qualité.
        Seuls les clips <code>reviewed_tts</code>/<code>premium_ready</code> sont considérés prêts
        pour les examens blancs.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {["premium_ready", "reviewed_tts", "prototype_tts", "rejected"].map((t) => (
          <a
            key={t}
            href={`/admin/audio?tier=${t}`}
            className="rounded-full border border-border-strong px-3 py-1 hover:bg-surface-2"
          >
            {t.replace("_tts", "")} ({byTier[t] ?? 0})
          </a>
        ))}
        <a href="/admin/audio" className="rounded-full px-3 py-1 text-navy hover:underline">
          Tout
        </a>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const qa = (r.qa as any) ?? {};
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{r.id}</span>
                <Badge variant="outline" size="sm">
                  {r.cefr}
                </Badge>
                <Badge variant={TIER_VARIANT[r.quality] ?? "neutral"} size="sm">
                  {r.quality}
                </Badge>
                <span className="text-xs text-faint">
                  {Math.round(Number(r.duration))}s · vol {qa.rms ?? "?"} · gap {qa.maxGap ?? "?"}s
                  ·{qa.distinctVoices ?? "?"} voix
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-ink">{r.stem}</p>
              {/* biome-ignore lint/a11y/useMediaCaption: transcript available on the question */}
              <audio src={r.file} controls preload="none" className="mt-2 w-full max-w-md" />
              <div className="mt-2">
                <AudioQaControls id={r.id} current={r.quality} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
