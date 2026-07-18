"use client";
import { Check, Circle, Mic, MicOff, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { advanceMock } from "@/app/(app)/mock/actions";
import { useToast } from "@/components/toast";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatClock } from "@/lib/exam/timer";
import type { MockSpeakingTask } from "@/lib/practice/mock";

function pickMime(): string | undefined {
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return c.find((x) => MediaRecorder.isTypeSupported(x));
}

function TaskRecorder({
  sessionId,
  task,
  onDone,
}: {
  sessionId: string;
  task: MockSpeakingTask;
  onDone: (taskId: string) => void;
}) {
  const toast = useToast();
  const [phase, setPhase] = useState<"idle" | "recording" | "uploading" | "done" | "denied">(
    task.submitted ? "done" : "idle",
  );
  const [count, setCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const metrics = useRef({ sum: 0, frames: 0, silent: 0 });
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    ctxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => cleanup, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];
      metrics.current = { sum: 0, frames: 0, silent: 0 };
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = upload;
      rec.start(200);
      // meter
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const an = ctxRef.current.createAnalyser();
      an.fftSize = 512;
      ctxRef.current.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(data);
        let s = 0;
        for (const v of data) s += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(s / data.length);
        metrics.current.sum += rms;
        metrics.current.frames++;
        if (rms < 0.02) metrics.current.silent++;
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setPhase("recording");
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const el = Math.round((Date.now() - startRef.current) / 1000);
        setCount(el);
        if (el >= task.speakSeconds) stop();
      }, 250);
    } catch {
      setPhase("denied");
    }
  }
  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recRef.current?.state !== "inactive") recRef.current?.stop();
  }
  async function upload() {
    setPhase("uploading");
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    const { sum, frames, silent } = metrics.current;
    const blob = new Blob(chunks.current, { type: recRef.current?.mimeType || "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob, "rec.webm");
    fd.append("taskId", task.id);
    fd.append("sessionId", sessionId);
    fd.append("durationSeconds", String(dur));
    fd.append("avgVolume", String(frames ? sum / frames : 0));
    fd.append("silenceRatio", String(frames ? silent / frames : 0));
    fd.append("coveredPoints", String(task.guidingPointsFr.length));
    try {
      const r = await fetch("/api/speaking/submit", { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      setPhase("done");
      onDone(task.id);
    } catch {
      toast("Envoi de l'enregistrement échoué.", "error");
      setPhase("idle");
    }
    ctxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Badge variant="navy" size="sm">
          {task.prepSeconds ? `${task.prepSeconds}s prépa · ` : ""}
          {task.speakSeconds}s
        </Badge>
        {phase === "done" && (
          <Badge variant="success" size="sm">
            <Check className="h-3 w-3" /> Enregistré
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">{task.contextFr}</p>
      <p className="mt-1 text-sm font-medium">{task.promptFr}</p>
      <ul className="mt-2 list-disc pl-5 text-xs text-muted">
        {task.guidingPointsFr.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="mt-3">
        {phase === "idle" && (
          <Button size="sm" variant="primary" onClick={start}>
            <Mic className="h-4 w-4" /> Enregistrer
          </Button>
        )}
        {phase === "recording" && (
          <Button size="sm" variant="danger" onClick={stop}>
            <Circle className="mr-1 h-3 w-3 animate-pulse fill-current" />
            <Square className="h-4 w-4" /> Arrêter ({formatClock(count)})
          </Button>
        )}
        {phase === "uploading" && <span className="text-sm text-muted">Envoi…</span>}
        {phase === "done" && (
          <Button size="sm" variant="ghost" onClick={() => setPhase("idle")}>
            Refaire
          </Button>
        )}
        {phase === "denied" && (
          <Alert tone="warning" icon={<MicOff className="h-4 w-4" />}>
            Micro indisponible. Vous pouvez passer cette tâche ; elle comptera comme non réalisée.
          </Alert>
        )}
      </div>
    </Card>
  );
}

export function MockSpeakingSection({
  sessionId,
  tasks,
  expired,
  totalSections,
  sectionIndex,
}: {
  sessionId: string;
  tasks: MockSpeakingTask[];
  expired: boolean;
  totalSections: number;
  sectionIndex: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState<Set<string>>(new Set(tasks.filter((t) => t.submitted).map((t) => t.id)));
  const [finishing, setFinishing] = useState(false);
  const doneRef = useRef(false);

  const finish = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinishing(true);
    try {
      const res = await advanceMock(sessionId);
      if (res.done && res.attemptId) router.push(`/attempts/${res.attemptId}/results`);
      else router.refresh();
    } catch {
      toast("Échec.", "error");
      doneRef.current = false;
      setFinishing(false);
    }
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on expiry
  useEffect(() => {
    if (expired) finish();
  }, [expired]);

  const isLast = sectionIndex + 1 >= totalSections;

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <TaskRecorder key={t.id} sessionId={sessionId} task={t} onDone={(id) => setDone((s) => new Set(s).add(id))} />
      ))}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted">{done.size}/{tasks.length} enregistrées</span>
        <Button variant="primary" onClick={finish} disabled={finishing}>
          {finishing ? "…" : isLast ? "Terminer l'examen" : "Terminer l'expression orale"}
        </Button>
      </div>
    </div>
  );
}
