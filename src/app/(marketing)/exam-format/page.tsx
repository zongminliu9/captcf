import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EXAM_SPEC,
  SKILLS,
  SPEAKING_TASKS,
  SPEC_VERSION,
  type SkillId,
  WRITING_TASKS,
} from "@/lib/exam/config";
import { ArrowRight, BookOpenText, Clock, Headphones, Mic, PenLine, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Format de l'examen",
  description:
    "Détail des quatre épreuves du TCF Canada : nombre de questions et de tâches, durée, notation, et ce que chaque épreuve évalue.",
};

const SKILL_ICON: Record<SkillId, LucideIcon> = {
  listening: Headphones,
  reading: BookOpenText,
  writing: PenLine,
  speaking: Mic,
};

const SKILL_DETAIL: Record<SkillId, string[]> = {
  listening: [
    "39 questions à choix multiple sur des enregistrements courts.",
    "Difficulté croissante, du niveau A1 au niveau C2.",
    "Chaque document audio n'est diffusé qu'une seule fois.",
    "Formats variés : images, dialogues, annonces, interviews, argumentations.",
  ],
  reading: [
    "39 questions à choix multiple sur des documents écrits.",
    "Difficulté croissante tout au long de l'épreuve.",
    "Supports variés : affiches, correspondances, articles, textes argumentatifs.",
    "Chaque question propose quatre réponses possibles, une seule correcte.",
  ],
  writing: [
    "3 tâches à réaliser dans le temps imparti pour la section complète.",
    "Tâches progressives, du message simple à la comparaison argumentée.",
    "Chaque tâche impose une fourchette de mots à respecter.",
    "Évaluation par des correcteurs selon une grille officielle.",
  ],
  speaking: [
    "3 tâches enregistrées face à un examinateur.",
    "Environ 12 minutes au total, préparation comprise.",
    "De la présentation personnelle à l'expression d'un point de vue.",
    "Évaluation de l'aisance, de la correction et de la richesse de la langue.",
  ],
};

/** Format a duration in seconds as a compact French label. */
function fmtSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} min`;
  return `${m} min ${s.toString().padStart(2, "0")}`;
}

export default function ExamFormatPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <Clock className="h-3.5 w-3.5" /> Structure officielle actuelle
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Format de l'examen</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Le TCF Canada se compose de quatre épreuves obligatoires : deux de compréhension à choix
          multiple et deux de production. Voici le détail de chacune, épreuve par épreuve.
        </p>
      </header>

      {/* ── Summary tiles ─────────────────────────────────────── */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SKILLS.map((s) => {
          const spec = EXAM_SPEC[s];
          return (
            <div key={s} className="card p-4 text-center">
              <div className="text-2xl font-semibold text-navy">
                {spec.itemCount}
                <span className="text-sm font-medium text-muted">
                  {spec.kind === "qcm" ? " Q" : " tâches"}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-ink">{spec.code}</div>
              <div className="mt-0.5 text-xs text-muted">
                {Math.round(spec.durationSeconds / 60)} min
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Per-section detail ────────────────────────────────── */}
      <div className="mt-12 space-y-6">
        {SKILLS.map((s) => {
          const spec = EXAM_SPEC[s];
          const Icon = SKILL_ICON[s];
          return (
            <Card key={s} className="p-6 sm:p-7" raised>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50">
                  <Icon className="h-6 w-6 text-navy" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{spec.labelFr}</h2>
                    <Badge variant="outline">{spec.code}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{spec.labelEn}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-lg font-semibold text-navy">
                      {Math.round(spec.durationSeconds / 60)} min
                    </div>
                    <div className="text-xs text-muted">durée</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-navy">
                      /{spec.scoreKind === "scale699" ? "699" : "20"}
                    </div>
                    <div className="text-xs text-muted">notation</div>
                  </div>
                </div>
              </div>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {SKILL_DETAIL[s].map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                    {d}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* ── Writing tasks ─────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-navy" />
          <h2 className="display text-2xl leading-tight">Le détail de l'expression écrite</h2>
        </div>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Trois tâches à réaliser en {Math.round(EXAM_SPEC.writing.durationSeconds / 60)} minutes.
          Le respect de la fourchette de mots fait partie des critères de notation.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {WRITING_TASKS.map((task) => (
            <Card key={task.code} className="flex flex-col p-5">
              <Badge variant="navy" size="sm" className="self-start">
                Tâche {task.taskNumber}
              </Badge>
              <h3 className="mt-3 font-semibold leading-snug">{task.titleFr}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{task.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium text-ink">
                  {task.minWords}–{task.maxWords} mots
                </span>
                <span className="inline-flex items-center gap-1 text-muted">
                  <Timer className="h-3.5 w-3.5" /> ~{task.suggestedMinutes} min
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Speaking tasks ────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-navy" />
          <h2 className="display text-2xl leading-tight">Le détail de l'expression orale</h2>
        </div>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Un entretien enregistré d'environ {Math.round(EXAM_SPEC.speaking.durationSeconds / 60)}{" "}
          minutes, en trois tâches. Seule la tâche 2 prévoit un temps de préparation.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SPEAKING_TASKS.map((task) => (
            <Card key={task.code} className="flex flex-col p-5">
              <Badge variant="navy" size="sm" className="self-start">
                Tâche {task.taskNumber}
              </Badge>
              <h3 className="mt-3 font-semibold leading-snug">{task.titleFr}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{task.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="inline-flex items-center gap-1 text-muted">
                  <Timer className="h-3.5 w-3.5" />
                  {task.prepSeconds > 0 ? `${fmtSeconds(task.prepSeconds)} prépa.` : "sans prépa."}
                </span>
                <span className="font-medium text-ink">{fmtSeconds(task.speakSeconds)}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Disclaimer + CTA ──────────────────────────────────── */}
      <div className="mt-14">
        <Alert tone="info">
          Structure de référence version {SPEC_VERSION}. Les valeurs présentées reflètent la
          structure officielle actuelle du TCF Canada. CapTCF est un service indépendant, non
          affilié à France Éducation international ni à IRCC.
        </Alert>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" variant="primary">
          <a href="/practice/start?mode=quick">
            S'entraîner sur une épreuve <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/mock-tests">Faire un examen blanc complet</Link>
        </Button>
      </div>
    </div>
  );
}
