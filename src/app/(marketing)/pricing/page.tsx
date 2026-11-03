import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPremiumOffers } from "@/lib/billing/offer";
import { paymentsEnabled } from "@/lib/billing/stripe";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { ArrowRight, Check, Lock, Minus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Comparez l'offre gratuite et l'offre Premium de CapTCF : entraînement illimité, banque de questions, examens blancs complets, analyses avancées et plan d'étude.",
};

export const dynamic = "force-dynamic";

const free = PLAN_LIMITS.free;
const premium = PLAN_LIMITS.premium;

const CHECKOUT_NOTICES: Record<string, { tone: "info" | "warning" | "danger"; text: string }> = {
  canceled: { tone: "info", text: "Paiement annulé — aucun montant n'a été prélevé." },
  pending: {
    tone: "warning",
    text: "Votre paiement est en cours de confirmation. Premium sera activé automatiquement dans quelques instants — actualisez votre tableau de bord.",
  },
  error: {
    tone: "danger",
    text: "Le paiement n'a pas pu être lancé. Réessayez dans un instant ; si le problème persiste, contactez-nous.",
  },
};

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

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const notice = checkout ? CHECKOUT_NOTICES[checkout] : undefined;
  // Real checkout appears only when Stripe is fully configured AND the price loads. The dev
  // simulator keeps the button usable locally; in the hosted beta neither is true.
  const offers = await getPremiumOffers();
  const main = offers?.plans[0] ?? null;
  const simulator =
    (process.env.PAYMENTS_PROVIDER ?? "simulator") === "simulator" &&
    process.env.NODE_ENV !== "production";
  const canBuy = !!offers || simulator;
  const stripeLive = paymentsEnabled(); // configured, but the price couldn't be loaded right now
  const taxNote =
    process.env.STRIPE_AUTOMATIC_TAX === "true" ? " Taxes calculées au paiement." : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {notice && (
        <Alert tone={notice.tone} className="mb-8">
          {notice.text}
        </Alert>
      )}
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
            <span className="display text-4xl">{offers?.zeroLabel ?? "0 $"}</span>
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
            {main ? (
              <>
                <span className="display text-4xl">{main.amountLabel}</span>
                <span className="ml-1 text-sm text-muted">{main.cadence}</span>
              </>
            ) : (
              <>
                <span className="display text-4xl">Premium</span>
                <span className="ml-1 text-sm text-muted">accès complet</span>
              </>
            )}
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {[
              "Entraînement personnalisé illimité",
              "Les 4 examens blancs complets et minutés",
              "Banque de questions intégrale",
              "Analyses avancées par compétence et par type",
              "Plan d'étude complet vers votre objectif",
              "Analyse approfondie de vos erreurs",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
          {offers ? (
            <div className="mt-7 space-y-3">
              {/* plain form POSTs so the checkout route handler runs (then 303 → Stripe) */}
              {offers.plans.map((o, i) => (
                <form key={o.plan} action="/api/billing/checkout" method="post">
                  <input type="hidden" name="plan" value={o.plan} />
                  <Button
                    type="submit"
                    className="w-full"
                    variant={i === 0 ? "primary" : "outline"}
                    size="lg"
                  >
                    {i === 0 ? "Passer à Premium" : "Choisir"} — {o.amountLabel} {o.cadence}
                    {o.savings > 0 && (
                      <Badge variant="gold" className="ml-1">
                        −{o.savings} %
                      </Badge>
                    )}
                  </Button>
                </form>
              ))}
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <Lock className="h-3 w-3 shrink-0" />
                {offers.plans.every((o) => o.mode === "subscription")
                  ? "Paiement sécurisé par Stripe. Renouvellement automatique, résiliable à tout moment depuis vos réglages."
                  : "Paiement sécurisé par Stripe."}
                {taxNote}
              </p>
            </div>
          ) : canBuy ? (
            <div className="mt-7">
              {/* dev simulator: grants Premium locally, no money involved */}
              <form action="/api/billing/checkout" method="post">
                <Button type="submit" className="w-full" variant="primary" size="lg">
                  Passer à Premium <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : stripeLive ? (
            <div className="mt-7">
              <Button className="w-full" variant="primary" size="lg" disabled>
                Paiement momentanément indisponible
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                Notre prestataire de paiement ne répond pas pour l'instant. Réessayez dans quelques
                minutes.
              </p>
            </div>
          ) : (
            <div className="mt-7">
              <Button className="w-full" variant="primary" size="lg" disabled>
                Beta — paiements bientôt disponibles
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                Les paiements ne sont pas encore activés pendant la Beta privée. Les testeurs
                invités bénéficient d'un accès Premium gratuit.
              </p>
            </div>
          )}
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

      {/* ── Dev simulator note (local development only) ─────────── */}
      {simulator && (
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
      )}

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
