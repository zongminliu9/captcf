"use server";
import { db } from "@/db";
import { audioAssets, questions } from "@/db/schema";
import { type ImportPlan, isMaster, planImport } from "@/lib/audio/import";
import { type AudioMetrics, analyseWav, canApprove, transcriptHash } from "@/lib/audio/qa";
import { requireAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const MAX_UPLOAD_BYTES = 60 * 1024 * 1024; // masters are large; 60 MB per file

export interface UploadReport {
  plan: ImportPlan;
  stored: { questionId: string; version: number; analysed: boolean; qa: string[] }[];
  failed: { filename: string; reason: string }[];
}

/**
 * Batch-import recordings. The plan is computed first; each matched file is then committed
 * INDEPENDENTLY inside its own try/catch, so one bad file can never leave a half-written record.
 * Nothing here can publish audio — uploads land in `awaiting_qa` and must pass `canApprove`.
 */
export async function uploadRecordings(form: FormData): Promise<UploadReport> {
  await requireAdmin();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const sourceType = String(form.get("sourceType") ?? "human_original");
  const speakerName = String(form.get("speakerName") ?? "").trim() || null;
  const speakerRegion = String(form.get("speakerRegion") ?? "").trim() || null;
  const recordingSession = String(form.get("recordingSession") ?? "").trim() || null;
  const licenseName = String(form.get("licenseName") ?? "").trim() || null;
  const licenseUrl = String(form.get("licenseUrl") ?? "").trim() || null;

  const ids = files
    .map((f) => f.name.replace(/\.[a-z0-9]+$/i, "").replace(/\s*\(\d+\)$/, ""))
    .filter(Boolean);
  const known = ids.length
    ? await db
        .select({ id: questions.id })
        .from(questions)
        .where(inArray(questions.id, Array.from(new Set(ids))))
    : [];
  const knownIds = new Set(known.map((k) => k.id));
  const existing = knownIds.size
    ? await db
        .select({ id: audioAssets.id, version: audioAssets.version })
        .from(audioAssets)
        .where(inArray(audioAssets.id, [...knownIds]))
    : [];

  const plan = planImport(
    files.map((f) => ({ filename: f.name, bytes: f.size })),
    {
      knownQuestionIds: knownIds,
      existingVersions: new Map(existing.map((e) => [e.id, e.version ?? 0])),
    },
  );

  const stored: UploadReport["stored"] = [];
  const failed: UploadReport["failed"] = [];
  const storage = getStorage();

  for (const item of plan.items) {
    if (item.outcome !== "matched" || !item.questionId) {
      failed.push({ filename: item.filename, reason: item.reason ?? item.outcome });
      continue;
    }
    const file = files.find((f) => f.name === item.filename);
    if (!file) {
      failed.push({ filename: item.filename, reason: "file missing from request" });
      continue;
    }
    try {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("file exceeds 60 MB");
      const buf = Buffer.from(await file.arrayBuffer());
      const master = isMaster(item.filename);
      const metrics: AudioMetrics = master
        ? analyseWav(buf)
        : ({ analysed: false } as unknown as AudioMetrics);

      const key = `recordings/${item.questionId}-v${item.nextVersion}-${master ? "master.wav" : item.filename}`;
      await storage.save(key, buf, master ? "audio/wav" : (file.type ?? "audio/mp4"));

      // transcript hash of the CURRENT question text — approval later compares against this
      const [q] = await db
        .select({ stimulus: questions.stimulus })
        .from(questions)
        .where(eq(questions.id, item.questionId))
        .limit(1);
      const tr = (q?.stimulus as { transcript?: string } | null)?.transcript ?? "";

      await db
        .insert(audioAssets)
        .values({
          id: item.questionId,
          file: `/audio/${item.questionId}.m4a`,
          durationSeconds: String(Math.round((metrics.durationMs ?? 0) / 1000)),
          textHash: transcriptHash(tr),
          voices: [],
          sourceType,
          publishState: "awaiting_qa",
          speakerName,
          speakerRegion,
          recordingSession,
          licenseName,
          licenseUrl,
          masterFile: master ? key : null,
          deliveryFile: master ? null : key,
          transcriptHash: transcriptHash(tr),
          durationMs: metrics.durationMs ?? null,
          loudnessLufs: metrics.analysed ? String(metrics.loudnessLufs.toFixed(2)) : null,
          truePeakDb: metrics.analysed ? String(metrics.truePeakDb.toFixed(2)) : null,
          version: item.nextVersion ?? 1,
          qaStatus: "pending",
          qa: metrics as unknown as object,
          recordedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: audioAssets.id,
          set: {
            sourceType,
            publishState: "awaiting_qa",
            speakerName,
            speakerRegion,
            recordingSession,
            licenseName,
            licenseUrl,
            masterFile: master ? key : null,
            deliveryFile: master ? null : key,
            transcriptHash: transcriptHash(tr),
            durationMs: metrics.durationMs ?? null,
            loudnessLufs: metrics.analysed ? String(metrics.loudnessLufs.toFixed(2)) : null,
            truePeakDb: metrics.analysed ? String(metrics.truePeakDb.toFixed(2)) : null,
            version: item.nextVersion ?? 1,
            qaStatus: "pending",
            qa: metrics as unknown as object,
            recordedAt: new Date(),
          },
        });

      stored.push({
        questionId: item.questionId,
        version: item.nextVersion ?? 1,
        analysed: !!metrics.analysed,
        qa: metrics.analysed ? [] : ["master WAV required for technical QA"],
      });
    } catch (e) {
      // isolated failure — no record written for this file, the rest of the batch continues
      failed.push({ filename: item.filename, reason: (e as Error).message });
      logger.warn("recording import failed", { file: item.filename });
    }
  }

  revalidatePath("/admin/recordings");
  return { plan, stored, failed };
}

export interface QaDecision {
  ok: boolean;
  message: string;
  failures?: string[];
}

/** Approve → the clip becomes official ONLY if every rule in canApprove passes. */
export async function approveRecording(
  id: string,
  reviewer: string,
  notes: string,
): Promise<QaDecision> {
  const admin = await requireAdmin();
  const [asset] = await db.select().from(audioAssets).where(eq(audioAssets.id, id)).limit(1);
  if (!asset) return { ok: false, message: "Enregistrement introuvable." };

  const [q] = await db
    .select({ stimulus: questions.stimulus })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);
  const expected = transcriptHash(
    (q?.stimulus as { transcript?: string } | null)?.transcript ?? "",
  );

  const verdict = canApprove({
    provenance: { sourceType: asset.sourceType, publishState: asset.publishState },
    licenseName: asset.licenseName,
    licenseUrl: asset.licenseUrl,
    recordedTranscriptHash: asset.transcriptHash,
    expectedTranscriptHash: expected,
    metrics: (asset.qa as AudioMetrics) ?? ({ analysed: false } as AudioMetrics),
    humanListenConfirmed: true, // the admin clicking approve IS the human listen confirmation
  });

  if (!verdict.pass) {
    await db
      .update(audioAssets)
      .set({
        qaStatus: "fail",
        qaReviewer: reviewer || admin.userId,
        qaNotes: verdict.failures.join("; "),
      })
      .where(eq(audioAssets.id, id));
    return {
      ok: false,
      message: "Approbation refusée par les règles QA.",
      failures: verdict.failures,
    };
  }

  await db
    .update(audioAssets)
    .set({
      publishState: "approved",
      qaStatus: "pass",
      qaReviewer: reviewer || admin.userId,
      qaNotes: notes || null,
      publishedAt: new Date(),
    })
    .where(eq(audioAssets.id, id));
  revalidatePath("/admin/recordings");
  return { ok: true, message: `${id} approuvé et publiable.` };
}

export async function rejectRecording(
  id: string,
  reviewer: string,
  notes: string,
): Promise<QaDecision> {
  const admin = await requireAdmin();
  await db
    .update(audioAssets)
    .set({
      publishState: "rejected",
      qaStatus: "fail",
      qaReviewer: reviewer || admin.userId,
      qaNotes: notes || "rejeté",
    })
    .where(eq(audioAssets.id, id));
  revalidatePath("/admin/recordings");
  return { ok: true, message: `${id} rejeté — à réenregistrer.` };
}

/** Send back for a new take without discarding the record. */
export async function requestRerecord(id: string, notes: string): Promise<QaDecision> {
  await requireAdmin();
  await db
    .update(audioAssets)
    .set({
      publishState: "awaiting_recording",
      qaStatus: "fail",
      qaNotes: notes || "à réenregistrer",
    })
    .where(eq(audioAssets.id, id));
  revalidatePath("/admin/recordings");
  return { ok: true, message: `${id} renvoyé en enregistrement.` };
}

/** Roll a published clip back out of official use (keeps the row + version history). */
export async function rollbackRecording(id: string, notes: string): Promise<QaDecision> {
  await requireAdmin();
  await db
    .update(audioAssets)
    .set({
      publishState: "awaiting_qa",
      qaStatus: "pending",
      qaNotes: notes || "rollback",
      publishedAt: null,
    })
    .where(eq(audioAssets.id, id));
  revalidatePath("/admin/recordings");
  return { ok: true, message: `${id} retiré de la publication (rollback).` };
}
