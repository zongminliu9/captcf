import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Brain,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { EXAM_SPEC } from "@/lib/exam/config";
import { getT } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t } = await getT();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-navy-50 blur-3xl" />
          <div className="absolute left-1/4 top-40 h-72 w-72 rounded-full bg-gold-50 blur-3xl opacity-60" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <Badge variant="navy" size="lg" className="mb-5">
              <Sparkles className="h-3.5 w-3.5" /> {t("brand.tagline")}
            </Badge>
            <h1 className="display text-4xl leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
              {t("home.hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              {t("home.hero.subtitle")}
            </p>
            <ul className="mt-6 space-y-2.5">
              {["home.hero.point1", "home.hero.point2", "home.hero.point3"].map((k) => (
                <li key={k} className="flex items-center gap-2.5 text-[0.97rem] text-ink">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="primary">
                <Link href="/practice/quick">
                  {t("cta.start_free")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/diagnostic">{t("cta.quick_test")}</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-faint">{t("common.no_account_needed")}.</p>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* ── Exam facts strip ─────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-none sm:grid-cols-4">
          {(["listening", "reading", "writing", "speaking"] as const).map((s) => {
            const spec = EXAM_SPEC[s];
            return (
              <div key={s} className="px-5 py-6 text-center">
                <div className="text-2xl font-semibold text-navy">
                  {spec.kind === "qcm" ? spec.itemCount : `${spec.itemCount} tâches`}
                </div>
                <div className="mt-1 text-sm font-medium text-ink">{spec.labelFr}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {Math.round(spec.durationSeconds / 60)} {t("common.minutes")} · {spec.code}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <Section
        eyebrow="Un vrai système d'apprentissage"
        title="Pas une liste de questions. Une boucle qui vous fait progresser."
      >
        <div className="grid gap-5 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy">
                {i + 1}
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Four skills ──────────────────────────────────────── */}
      <Section
        eyebrow="Les quatre compétences"
        title="Un entraînement dédié pour chaque épreuve officielle"
        muted
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s) => (
            <Card key={s.href} className="group flex flex-col p-6" raised>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: "var(--navy-50)" }}
              >
                <s.icon className="h-6 w-6 text-navy" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.body}</p>
              <Link
                href={s.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy group-hover:gap-2"
              >
                Découvrir <ArrowRight className="h-4 w-4 transition-all" />
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Adaptive recommendation ──────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="gold" className="mb-4">
              <Brain className="h-3.5 w-3.5" /> Recommandations explicables
            </Badge>
            <h2 className="display text-3xl leading-tight">
              Il sait pourquoi il vous propose chaque exercice
            </h2>
            <p className="mt-4 text-muted">
              CapTCF suit votre maîtrise par compétence et par type de question, détecte vos
              baisses de forme, vos révisions en retard et l'écart avec votre objectif NCLC — puis
              transforme tout cela en une seule action prioritaire, expliquée en clair.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Maîtrise, confiance et tendance suivies séparément",
                "Révision espacée (SM-2) pour vos erreurs et votre vocabulaire",
                "Estimation NCLC transparente, jamais présentée comme officielle",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 text-ink">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6" raised>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-faint">
              <Target className="h-4 w-4" /> Aujourd'hui
            </div>
            <h3 className="mt-3 text-lg font-semibold">
              Votre compréhension orale a baissé sur les dialogues B2.
            </h3>
            <p className="mt-1.5 text-sm text-muted">
              Séance ciblée de 8 minutes pour reprendre le dessus avant votre examen.
            </p>
            <div className="mt-5 space-y-3">
              <Meter label="Compréhension orale" value={0.52} tone="accent" showValue />
              <Meter label="Compréhension écrite" value={0.71} tone="navy" showValue />
              <Meter label="Expression écrite" value={0.64} tone="gold" showValue />
            </div>
            <Button asChild className="mt-6 w-full" variant="primary">
              <Link href="/practice/quick">
                Commencer la séance <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* ── Mock exams ───────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Badge variant="navy" className="mb-4">
              <Clock className="h-3.5 w-3.5" /> Conditions réelles
            </Badge>
            <h2 className="display text-3xl leading-tight">Examens blancs complets et minutés</h2>
            <p className="mt-4 max-w-xl text-muted">
              Quatre examens blancs suivant la structure officielle actuelle : minuterie fidèle,
              audio joué selon les règles, aucune réponse dévoilée avant la fin, et enregistrement
              automatique. Rafraîchir la page ne remet jamais le chronomètre à zéro.
            </p>
            <Button asChild className="mt-6" variant="primary">
              <Link href="/mock-tests">Voir les examens blancs</Link>
            </Button>
          </div>
          <div className="grid w-full flex-1 grid-cols-2 gap-3">
            <FactTile value="39" label="questions · écoute (35 min)" />
            <FactTile value="39" label="questions · lecture (60 min)" />
            <FactTile value="3" label="tâches · écrit (60 min)" />
            <FactTile value="3" label="tâches · oral (~12 min)" />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <h2 className="display text-3xl sm:text-4xl">Commencez maintenant, sans inscription</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Faites votre première séance, voyez votre analyse, et créez un compte plus tard pour
          conserver toute votre progression. Vos données d'invité sont fusionnées automatiquement.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <Link href="/practice/quick">
              {t("cta.start_free")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">Voir les tarifs</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function HeroPreview() {
  return (
    <Card className="p-5 sm:p-6" raised>
      <div className="flex items-center justify-between">
        <Badge variant="navy">
          <Headphones className="h-3.5 w-3.5" /> Compréhension orale · B2
        </Badge>
        <span className="font-mono text-sm text-muted tabular-nums">00:32</span>
      </div>
      <p className="mt-4 text-sm text-muted">Vous entendez une conversation dans un bureau.</p>
      <p className="mt-2 font-medium leading-snug">
        Pourquoi la responsable propose-t-elle de reporter la réunion ?
      </p>
      <div className="mt-4 space-y-2">
        {[
          { t: "Plusieurs membres de l'équipe sont absents.", ok: true },
          { t: "La salle n'est pas disponible.", ok: false },
          { t: "Le rapport n'est pas terminé.", ok: false },
          { t: "Le client a annulé sa visite.", ok: false },
        ].map((o, i) => (
          <div
            key={o.t}
            className={`flex items-center gap-3 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm ${
              o.ok
                ? "border-success/40 bg-success-50 text-ink"
                : "border-border bg-surface text-ink"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                o.ok ? "bg-success text-white" : "bg-surface-3 text-muted"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            {o.t}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-sm)] bg-navy-50 px-3.5 py-2.5 text-xs text-navy">
        <BarChart3 className="h-4 w-4" /> Après la réponse : explication, distracteurs analysés et
        transcription.
      </div>
    </Card>
  );
}

function Section({
  eyebrow,
  title,
  children,
  muted,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "bg-surface" : ""}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-wide text-navy">{eyebrow}</div>
          <h2 className="display mt-2 text-3xl leading-tight">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function FactTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-semibold text-navy">{value}</div>
      <div className="mt-1 text-xs leading-snug text-muted">{label}</div>
    </div>
  );
}

const STEPS = [
  { title: "Diagnostic express", body: "8–12 min d'écoute et de lecture pour situer votre niveau et vos points faibles." },
  { title: "Séances ciblées", body: "Le système choisit le type de question qui vous fera progresser le plus." },
  { title: "Erreurs recyclées", body: "Chaque erreur revient au bon moment grâce à la révision espacée." },
  { title: "Examens blancs", body: "Validez en conditions réelles, puis analysez épreuve par épreuve." },
];

const SKILLS = [
  { href: "/listening", icon: Headphones, title: "Compréhension orale", body: "Dialogues, annonces et interviews avec audio réel et transcription." },
  { href: "/reading", icon: BookOpenText, title: "Compréhension écrite", body: "Avis, courriels, articles et textes argumentatifs de tous niveaux." },
  { href: "/writing", icon: PenLine, title: "Expression écrite", body: "Les 3 tâches, avec retour automatique même sans IA." },
  { href: "/speaking", icon: Mic, title: "Expression orale", body: "Enregistrement réel, réécoute et auto-évaluation guidée." },
];
