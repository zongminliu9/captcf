import {
  ArrowRight,
  Clock,
  EyeOff,
  Gift,
  Headphones,
  Lock,
  RefreshCw,
  Save,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXAM_SPEC } from "@/lib/exam/config";

export const metadata: Metadata = {
  title: "Examens blancs",
  description:
    "Quatre examens blancs complets reproduisant la structure officielle du TCF Canada : minutés, audio joué selon les règles, sans réponse dévoilée avant la fin.",
};

const listening = EXAM_SPEC.listening;
const reading = EXAM_SPEC.reading;
const writing = EXAM_SPEC.writing;
const speaking = EXAM_SPEC.speaking;

const totalMinutes = Math.round(
  (listening.durationSeconds +
    reading.durationSeconds +
    writing.durationSeconds +
    speaking.durationSeconds) /
    60,
);

const RULES = [
  {
    icon: Clock,
    title: "Minuté fidèlement",
    body: "Chaque épreuve respecte sa durée officielle. Le chronomètre continue même si vous changez d'onglet.",
  },
  {
    icon: Headphones,
    title: "Audio selon les règles",
    body: "En compréhension orale, chaque enregistrement n'est joué qu'une seule fois, comme le jour de l'examen.",
  },
  {
    icon: EyeOff,
    title: "Aucune réponse dévoilée",
    body: "Les corrections et les explications n'apparaissent qu'une fois l'examen entièrement terminé.",
  },
  {
    icon: RefreshCw,
    title: "Rafraîchissement sûr",
    body: "Recharger la page ne remet jamais le chronomètre à zéro : vous reprenez exactement où vous étiez.",
  },
  {
    icon: Save,
    title: "Enregistrement automatique",
    body: "Vos réponses sont sauvegardées au fil de l'eau. Rien n'est perdu en cas d'imprévu.",
  },
  {
    icon: Clock,
    title: "Soumission automatique",
    body: "À la fin du temps imparti, l'épreuve est soumise automatiquement, comme en conditions réelles.",
  },
];

const FORMS = [
  { n: 1, name: "Examen blanc 1", free: true },
  { n: 2, name: "Examen blanc 2", free: false },
  { n: 3, name: "Examen blanc 3", free: false },
  { n: 4, name: "Examen blanc 4", free: false },
];

export default function MockTestsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <Clock className="h-3.5 w-3.5" /> Conditions réelles
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Examens blancs complets</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Quatre examens blancs reproduisant fidèlement la structure officielle actuelle du TCF
          Canada. Vous les passez dans les mêmes conditions que le jour J, puis vous analysez vos
          résultats épreuve par épreuve.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <Link href="/mock">
              Voir les examens blancs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/exam-format">Comprendre le format</Link>
          </Button>
        </div>
      </header>

      {/* ── Structure tiles ───────────────────────────────────── */}
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-navy">{listening.itemCount}</div>
          <div className="mt-1 text-xs leading-snug text-muted">
            questions · écoute ({Math.round(listening.durationSeconds / 60)} min)
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-navy">{reading.itemCount}</div>
          <div className="mt-1 text-xs leading-snug text-muted">
            questions · lecture ({Math.round(reading.durationSeconds / 60)} min)
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-navy">{writing.itemCount}</div>
          <div className="mt-1 text-xs leading-snug text-muted">
            tâches · écrit ({Math.round(writing.durationSeconds / 60)} min)
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-navy">{speaking.itemCount}</div>
          <div className="mt-1 text-xs leading-snug text-muted">
            tâches · oral (~{Math.round(speaking.durationSeconds / 60)} min)
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-faint">
        Soit {listening.itemCount + reading.itemCount} questions à choix multiple et{" "}
        {writing.itemCount + speaking.itemCount} tâches de production par examen — environ{" "}
        {totalMinutes} minutes au total.
      </p>

      {/* ── Rules ─────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="display text-2xl leading-tight">Des conditions vraiment réalistes</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((r) => (
            <Card key={r.title} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50">
                <r.icon className="h-5 w-5 text-navy" />
              </div>
              <h3 className="mt-4 font-semibold">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── The four forms ────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="display text-2xl leading-tight">Les quatre examens blancs</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Chaque examen est une composition indépendante, équilibrée en difficulté et en thèmes. Le
          premier est proposé gratuitement en guise d'aperçu.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FORMS.map((form) => (
            <Card key={form.n} className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50 text-lg font-semibold text-navy">
                {form.n}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{form.name}</h3>
                  {form.free ? (
                    <Badge variant="success" size="sm">
                      <Gift className="h-3 w-3" /> Gratuit
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      <Lock className="h-3 w-3" /> Premium
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {listening.itemCount + reading.itemCount} QCM · {writing.itemCount}+
                  {speaking.itemCount} tâches
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Note + CTA ────────────────────────────────────────── */}
      <div className="mt-12">
        <Alert tone="info">
          L'examen blanc 1 est accessible gratuitement. Les examens blancs 2 à 4 font partie de
          l'offre Premium. Voir les{" "}
          <Link href="/pricing" className="font-medium underline">
            tarifs
          </Link>
          .
        </Alert>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" variant="primary">
          <Link href="/mock">
            Commencer un examen blanc <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="/practice/start?mode=quick">S'entraîner d'abord par compétence</a>
        </Button>
      </div>
    </div>
  );
}
