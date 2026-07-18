"use client";
import { formatClock } from "@/lib/exam/timer";
import { cn } from "@/lib/utils";
import { Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  durationSeconds?: number | null;
  allowSpeed?: boolean;
  allowScrub?: boolean;
  maxPlays?: number; // mock mode: limit replays
  onEnded?: () => void;
  compact?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({
  src,
  durationSeconds,
  allowSpeed = true,
  allowScrub = true,
  maxPlays,
  onEnded,
  compact,
}: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [speed, setSpeed] = useState(1);
  const [plays, setPlays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // reset when the source changes (next question)
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setPlays(0);
    setError(false);
    setLoading(true);
  }, [src]);

  const playsExhausted = maxPlays != null && plays >= maxPlays;

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      if (el.currentTime === 0 || el.ended) {
        if (playsExhausted) return;
        setPlays((p) => p + 1);
      }
      el.play().catch(() => setError(true));
    }
  };

  const replay = () => {
    const el = ref.current;
    if (!el || playsExhausted) return;
    el.currentTime = 0;
    setPlays((p) => p + 1);
    el.play().catch(() => setError(true));
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    setSpeed(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3",
        compact ? "" : "sm:p-4",
      )}
    >
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || durationSeconds || 0);
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading || (playsExhausted && !playing)}
          aria-label={playing ? "Pause" : "Lecture"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-on-navy transition hover:bg-navy-600 disabled:opacity-50"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "h-2 w-full overflow-hidden rounded-full bg-surface-3",
              allowScrub && "cursor-pointer",
            )}
            role={allowScrub ? "slider" : "progressbar"}
            aria-label="Position de lecture"
            aria-valuenow={Math.round(current)}
            aria-valuemax={Math.round(duration)}
            aria-valuemin={0}
            tabIndex={allowScrub ? 0 : -1}
            onClick={(e) => {
              if (!allowScrub || !ref.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              ref.current.currentTime = ratio * duration;
            }}
            onKeyDown={(e) => {
              if (!allowScrub || !ref.current) return;
              if (e.key === "ArrowRight") ref.current.currentTime = Math.min(duration, current + 5);
              if (e.key === "ArrowLeft") ref.current.currentTime = Math.max(0, current - 5);
            }}
          >
            <div
              className="h-full rounded-full bg-navy transition-[width]"
              style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-muted tabular-nums">
            <span>{formatClock(current)}</span>
            <span>{formatClock(duration)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={replay}
            disabled={playsExhausted}
            aria-label="Réécouter"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-40"
          >
            <RotateCcw className="h-[18px] w-[18px]" />
          </button>
          {allowSpeed && (
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Vitesse ${speed}×`}
              className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-ink"
            >
              <Gauge className="h-4 w-4" /> {speed}×
            </button>
          )}
        </div>
      </div>

      {maxPlays != null && (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {playsExhausted
            ? "Nombre d'écoutes atteint (comme à l'examen)."
            : `Écoutes restantes : ${maxPlays - plays}`}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          Impossible de charger l'audio.{" "}
          <button type="button" className="underline" onClick={() => ref.current?.load()}>
            Réessayer
          </button>
        </p>
      )}
    </div>
  );
}
