"use client";
import { useToast } from "@/components/toast";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatClock } from "@/lib/exam/timer";
import type { SpeakingAnalysis } from "@/lib/speaking/analyze";
import { cn } from "@/lib/utils";
import { AlertTriangle, Circle, Mic, MicOff, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SpeakingFeedback } from "./speaking-feedback";

type Phase =
  | "ready"
  | "prep"
  | "recording"
  | "recorded"
  | "submitting"
  | "feedback"
  | "denied"
  | "nomic";

interface Take {
  url: string;
  blob: Blob;
  duration: number;
  avgVolume: number;
  silenceRatio: number;
}

interface Props {
  taskId: string;
  titleFr: string;
  promptFr: string;
  contextFr: string;
  guidingPointsFr: string[];
  prepSeconds: number;
  speakSeconds: number;
}

export function SpeakingRecorder(props: Props) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(0);
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [selected, setSelected] = useState(0);
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{
    analysis: SpeakingAnalysis;
    audioUrl: string;
    modelOutlineFr: string;
  } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef({ sum: 0, frames: 0, silent: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
      for (const t of takes) URL.revokeObjectURL(t.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopEverything() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function requestMicAndStart() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("nomic");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (props.prepSeconds > 0) startPrep();
      else startRecording();
    } catch {
      setPhase("denied");
    }
  }

  function startPrep() {
    setPhase("prep");
    setCount(props.prepSeconds);
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function meter() {
    const ctx = audioCtxRef.current;
    if (!ctx || !streamRef.current) return;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(streamRef.current).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) {
        const n = (v - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);
      metricsRef.current.sum += rms;
      metricsRef.current.frames += 1;
      if (rms < 0.02) metricsRef.current.silent += 1;
      setLevel(Math.min(1, rms * 3));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    metricsRef.current = { sum: 0, frames: 0, silent: 0 };
    chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = onStopped;
    rec.start(200);

    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    meter();

    setPhase("recording");
    startRef.current = Date.now();
    setCount(0);
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      setCount(elapsed);
      if (elapsed >= props.speakSeconds) stopRecording();
    }, 250);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
  }

  function onStopped() {
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    const blob = new Blob(chunksRef.current, {
      type: recorderRef.current?.mimeType || "audio/webm",
    });
    const { sum, frames, silent } = metricsRef.current;
    const avgVolume = frames ? sum / frames : 0;
    const silenceRatio = frames ? silent / frames : 0;
    const url = URL.createObjectURL(blob);
    setTakes((prev) => {
      const next = [...prev, { url, blob, duration, avgVolume, silenceRatio }].slice(-2);
      setSelected(next.length - 1);
      return next;
    });
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
    setPhase("recorded");
  }

  async function submit() {
    const take = takes[selected];
    if (!take) return;
    setPhase("submitting");
    const fd = new FormData();
    const ext = take.blob.type.includes("mp4") ? "mp4" : "webm";
    fd.append("audio", take.blob, `recording.${ext}`);
    fd.append("taskId", props.taskId);
    fd.append("durationSeconds", String(take.duration));
    fd.append("avgVolume", String(take.avgVolume));
    fd.append("silenceRatio", String(take.silenceRatio));
    fd.append("coveredPoints", String(covered.size));
    try {
      const res = await fetch("/api/speaking/submit", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFeedback({
        analysis: data.analysis,
        audioUrl: data.audioUrl,
        modelOutlineFr: data.modelOutlineFr,
      });
      setPhase("feedback");
    } catch {
      toast("Échec de l'envoi de l'enregistrement.", "error");
      setPhase("recorded");
    }
  }

  function reset() {
    stopEverything();
    setPhase("ready");
    setTakes((prev) => {
      for (const t of prev) URL.revokeObjectURL(t.url);
      return [];
    });
    setCovered(new Set());
    setFeedback(null);
  }

  // ── render ──
  const Header = (
    <div className="mb-5">
      <Badge variant="navy">{props.titleFr}</Badge>
      <p className="mt-3 text-sm text-muted">{props.contextFr}</p>
      <p className="mt-2 font-medium leading-snug">{props.promptFr}</p>
    </div>
  );

  const Checklist = (
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-medium text-ink">
        Points à aborder (auto-évaluation)
      </legend>
      <div className="space-y-2">
        {props.guidingPointsFr.map((pt, i) => (
          <label key={i} className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={covered.has(i)}
              onChange={(e) =>
                setCovered((s) => {
                  const next = new Set(s);
                  e.target.checked ? next.add(i) : next.delete(i);
                  return next;
                })
              }
              className="mt-0.5 h-4 w-4 accent-[var(--navy)]"
            />
            {pt}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {phase !== "feedback" && Header}

      {phase === "ready" && (
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
            <Mic className="h-7 w-7 text-navy" />
          </div>
          <p className="text-sm text-muted">
            {props.prepSeconds > 0
              ? `Vous aurez ${props.prepSeconds} s de préparation, puis ~${props.speakSeconds} s pour répondre.`
              : `Répondez pendant ~${props.speakSeconds} s, sans préparation.`}
          </p>
          <Button variant="primary" className="mt-4" onClick={requestMicAndStart}>
            <Mic className="h-4 w-4" /> Autoriser le micro et commencer
          </Button>
          {Checklist}
        </Card>
      )}

      {phase === "prep" && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted">Préparation…</p>
          <div className="mt-2 text-5xl font-semibold tabular-nums text-navy">{count}</div>
        </Card>
      )}

      {phase === "recording" && (
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-danger">
            <Circle className="h-3 w-3 animate-pulse fill-current" />
            <span className="font-medium">Enregistrement</span>
          </div>
          <div className="mt-3 font-mono text-4xl tabular-nums">
            {formatClock(count)}{" "}
            <span className="text-lg text-muted">/ {formatClock(props.speakSeconds)}</span>
          </div>
          <div
            className="mx-auto mt-5 h-3 w-full max-w-xs overflow-hidden rounded-full bg-surface-3"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-100"
              style={{ width: `${level * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            {level < 0.05 ? "On vous entend peu — parlez plus fort." : "Bon niveau sonore."}
          </p>
          <Button variant="danger" className="mt-5" onClick={stopRecording}>
            <Square className="h-4 w-4" /> Arrêter
          </Button>
        </Card>
      )}

      {(phase === "recorded" || phase === "submitting") && (
        <Card className="p-6">
          <h2 className="font-semibold">Réécoutez votre réponse</h2>
          <div className="mt-3 space-y-3">
            {takes.map((take, i) => (
              <label
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] border p-3",
                  selected === i ? "border-navy bg-navy-50" : "border-border",
                )}
              >
                {takes.length > 1 && (
                  <input
                    type="radio"
                    name="take"
                    checked={selected === i}
                    onChange={() => setSelected(i)}
                    className="h-4 w-4 accent-[var(--navy)]"
                  />
                )}
                <span className="text-sm font-medium">Prise {i + 1}</span>
                <span className="text-xs text-muted">{formatClock(take.duration)}</span>
                {/* biome-ignore lint/a11y/useMediaCaption: user's own recording */}
                <audio src={take.url} controls className="ml-auto h-9 max-w-[55%]" />
              </label>
            ))}
          </div>
          {Checklist}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={requestMicAndStart}
              disabled={phase === "submitting"}
            >
              <RotateCcw className="h-4 w-4" /> Refaire{" "}
              {takes.length >= 2 ? "(remplace la plus ancienne)" : ""}
            </Button>
            <Button variant="primary" onClick={submit} disabled={phase === "submitting"}>
              {phase === "submitting" ? "Envoi…" : "Soumettre"}
            </Button>
          </div>
        </Card>
      )}

      {phase === "feedback" && feedback && (
        <div>
          <h1 className="display mb-1 text-2xl">Votre auto-évaluation</h1>
          <p className="mb-5 text-sm text-muted">{props.titleFr}</p>
          <div className="mb-4">
            {/* biome-ignore lint/a11y/useMediaCaption: user's own recording */}
            <audio src={feedback.audioUrl} controls className="w-full" />
          </div>
          <SpeakingFeedback analysis={feedback.analysis} modelOutlineFr={feedback.modelOutlineFr} />
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Recommencer
            </Button>
            <Button asChild variant="primary">
              <a href="/speaking">Autres tâches</a>
            </Button>
          </div>
        </div>
      )}

      {(phase === "denied" || phase === "nomic") && (
        <Card className="p-6">
          <Alert tone="warning" icon={<MicOff className="h-4 w-4" />}>
            {phase === "denied"
              ? "Le micro est bloqué. Autorisez l'accès au micro dans votre navigateur, puis réessayez."
              : "Aucun micro détecté sur cet appareil."}
          </Alert>
          <p className="mt-4 text-sm text-muted">
            Vous pouvez tout de même préparer votre réponse : structurez vos idées à partir des
            points ci-dessous, puis réessayez l'enregistrement.
          </p>
          {Checklist}
          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" onClick={requestMicAndStart}>
              <AlertTriangle className="h-4 w-4" /> Réessayer le micro
            </Button>
            <Button asChild variant="ghost">
              <a href="/speaking">Retour</a>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function pickMime(): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) return c;
  return null;
}
