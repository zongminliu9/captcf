import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Comparez l'offre gratuite et l'offre Premium de CapTCF : entraînement, banque de questions, examens blancs, analyses avancées, retour par IA et plan d'étude.",
};

const free = PLAN_LIMITS.free;
const premium = PLAN_LIMITS.premium;

function practiceLabel(n: number): string {
  return n === Number.POSITIVE_INFINITY ? "illimité" : `${n} / jour`;
}

function bankLabel(cap: number | null): string {
  return cap === null ? "Banque complète" : `${cap} questions accessibles`;
}

interface Row {
  label: string;
  free: string | boolean;
  premium: string | boolean;
}

const ROWS: Row[] = [
  {
    label: "Séances d'entraînement",
    free: practiceLabel(free.practiceSessionsPerDay),
    premium: practiceLabel(premium.practiceSessionsPerDay),
  },
  {
    label: "Banque de questions",
    free: bankLabel(free.bankItemCap),
    premium: bankLabel(premium.bankItemCap),
  },
  {
    label: "Examen blanc d'essai",
    free: true,
    premium: true,
  },
  {
    label: "Les 4 examens blancs complets",
    free: free.features.full_mock_tests,
    premium: premium.features.full_mock_tests,
  },
  {
    label: "Entraînement personnalisé illimité",
    free: free.features.unlimited_custom_practice,
    premium: premium.features.unlimited_custom_practice,
  },
  {
    label: "Analyses avancées",
    free: free.features.advanced_analytics,
    premium: premium.features.advanced_analytics,
  },
  {
    label: "Retour détaillé par IA",
    free: free.features.ai_feedback,
    premium: premium.features.ai_feedback,
  },
  {
    label: "Plan d'étude complet",
    free: free.features.full_study_plan,
    premium: premium.features.full_study_plan,
  },
  {
    label: "Analyse approfondie des erreurs",
    free: free.features.deep_mistake_analysis,
    premium: premium.features.deep_mistake_analysis,
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-5 w-5 text-success" aria-label="Inclus" />
    ) : (
      <Minus className="mx-auto h-5 w-5 text-faint" aria-label="Non inclus" />
    );
  }
  return <span className="text-sm text-ink">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="text-center">
        <Badge variant="navy" size="lg" className="mb-5">
          <Sparkles className="h-3.5 w-3.5" /> Deux offres, aucune surprise
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Des tarifs clairs</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Commencez gratuitement, sans carte bancaire. Passez à Premium quand vous voulez tout
          débloquer pour votre préparation.
        </p>
      </header>

      {/* ── Plan cards ────────────────────────────────────────── */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Free */}
        <Card className="flex flex-col p-7">
          <h2 className="text-lg font-semibold">Gratuit</h2>
          <p className="mt-1 text-sm text-muted">Pour découvrir et s'entraîner régulièrement.</p>
          <div className="mt-5">
            <span className="display text-4xl">0 €</span>
            <span className="ml-1 text-sm text-muted">pour toujours</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {[
              `${free.practiceSessionsPerDay} séances d'entraînement par jour`,
              bankLabel(free.bankItemCap),
              "Estimation NCLC par compétence",
              "Un examen blanc d'essai complet",
              "Aucune inscription requise pour commencer",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-7 w-full" variant="outline" size="lg">
            <a href="/practice/start?mode=quick">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </Card>

        {/* Premium */}
        <Card className="relative flex flex-col border-navy/30 p-7 ring-1 ring-navy/20" raised>
          <div className="absolute right-6 top-6">
            <Badge variant="gold">Recommandé</Badge>
          </div>
          <h2 className="text-lg font-semibold">Premium</h2>
          <p className="mt-1 text-sm text-muted">Tout débloquer pour viser votre objectif NCLC.</p>
          <div className="mt-5">
            <span className="display text-4xl">Premium</span>
            <span className="ml-1 text-sm text-muted">accès complet</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {[
              "Entraînement personnalisé illimité",
              "Les 4 examens blancs complets et minutés",
              "Banque de questions intégrale",
              "Analyses avancées par compétence et par type",
              "Retour détaillé par IA sur vos productions",
              "Plan d'étude complet vers votre objectif",
              "Analyse approfondie de vos erreurs",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-7 w-full" variant="primary" size="lg">
            {/* plain <a> so the checkout route handler runs (simulator or Stripe) */}
            <a href="/api/billing/checkout">
              Passer à Premium <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </Card>
      </div>

      {/* ── Comparison table ──────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="display text-2xl leading-tight">Comparaison détaillée</h2>
        <div className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Comparaison des fonctionnalités entre l'offre gratuite et l'offre Premium
            </caption>
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Fonctionnalité
                </th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-ink">
                  Gratuit
                </th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-navy">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-ink">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="bg-navy-50/50 px-4 py-3 text-center">
                    <Cell value={row.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Dev simulator note ────────────────────────────────── */}
      <div className="mt-10">
        <Alert tone="info">
          <p className="font-medium">Paiement en environnement de développement</p>
          <p className="mt-1">
            En l'absence de clé Stripe configurée, le passage à Premium utilise un simulateur de
            paiement : l'accès Premium est accordé localement pour que toutes les fonctionnalités
            restent testables. Aucune vraie transaction n'a lieu.
          </p>
        </Alert>
      </div>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <div className="mt-12 text-center">
        <h2 className="display text-2xl">Essayez d'abord, décidez ensuite</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          L'offre gratuite suffit pour démarrer sérieusement. Vous ne passez à Premium que lorsque
          vous en ressentez le besoin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="primary" size="lg">
            <a href="/practice/start?mode=quick">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Consulter la FAQ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
