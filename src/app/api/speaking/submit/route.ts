import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { speakingFeedback, speakingSubmissions, speakingTasks } from "@/db/schema";
import { ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { analyzeSpeaking } from "@/lib/speaking/analyze";
import { extForMime, getStorage } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const actor = await ensureActor();
  const form = await req.formData();
  const file = form.get("audio");
  const taskId = String(form.get("taskId") ?? "");
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);
  const avgVolume = Number(form.get("avgVolume") ?? 0);
  const silenceRatio = Number(form.get("silenceRatio") ?? 0);
  const coveredPoints = Number(form.get("coveredPoints") ?? 0);

  if (!(file instanceof File)) return NextResponse.json({ error: "no_audio" }, { status: 400 });
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const [task] = await db.select().from(speakingTasks).where(eq(speakingTasks.id, taskId)).limit(1);
  if (!task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });

  const [submission] = await db
    .insert(speakingSubmissions)
    .values({
      ...ownerValues(actor),
      taskId,
      durationSeconds: String(durationSeconds),
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning({ id: speakingSubmissions.id });

  const ext = extForMime(file.type);
  const key = `speaking_${submission!.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await getStorage().save(key, buffer, file.type);
  await db
    .update(speakingSubmissions)
    .set({ audioFile: key })
    .where(eq(speakingSubmissions.id, submission!.id));

  const analysis = analyzeSpeaking({
    durationSeconds,
    targetSeconds: task.speakSeconds,
    avgVolume,
    silenceRatio,
    coveredPoints,
    totalPoints: task.guidingPointsFr.length,
  });

  await db.insert(speakingFeedback).values({
    submissionId: submission!.id,
    source: "local",
    rubric: analysis,
    summary: analysis.summaryFr,
  });

  return NextResponse.json({
    submissionId: submission!.id,
    analysis,
    audioUrl: `/api/speaking/audio/${submission!.id}`,
    modelOutlineFr: task.modelOutlineFr,
  });
}
