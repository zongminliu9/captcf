import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Cookie, Database, Download, Lock, Mic, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données CapTCF collecte, pourquoi, le fonctionnement du mode invité, l'usage des cookies, ainsi que l'export et la suppression de vos données.",
};

const LAST_UPDATED = "18 juillet 2026";

const COLLECTED = [
  {
    title: "Vos réponses et votre progression",
    body: "Les questions traitées, vos réponses, votre maîtrise par compétence et par type de question, ainsi que vos erreurs mises en révision.",
  },
  {
    title: "Adresse e-mail (compte facultatif)",
    body: "Uniquement si vous créez un compte, afin de sauvegarder et de synchroniser votre progression entre vos appareils.",
  },
  {
    title: "Préférences d'affichage",
    body: "La langue de l'interface et le thème clair ou sombre, pour retrouver vos réglages à chaque visite.",
  },
  {
    title: "Données techniques minimales",
    body: "Les informations strictement nécessaires au bon fonctionnement et à la sécurité du service (session, prévention des abus).",
  },
];

const COOKIES = [
  { name: "Session", role: "Vous garder connecté et sécuriser vos requêtes." },
  { name: "Langue", role: "Mémoriser la langue choisie pour l'interface." },
  { name: "Thème", role: "Mémoriser votre préférence d'affichage clair ou sombre." },
  {
    name: "Identifiant d'appareil (invité)",
    role: "Rattacher votre progression à votre appareil en mode invité.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <ShieldCheck className="h-3.5 w-3.5" /> Vos données vous appartiennent
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Politique de confidentialité</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Nous collectons le minimum nécessaire pour vous faire progresser, rien de plus. Voici
          exactement ce que nous conservons et ce que vous pouvez en faire.
        </p>
        <p className="mt-3 text-sm text-faint">Dernière mise à jour : {LAST_UPDATED}</p>
      </header>

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <Lock className="h-5 w-5 text-navy" />
          <h2 className="mt-3 font-semibold">Jamais vendues</h2>
          <p className="mt-1 text-sm text-muted">
            Nous ne vendons ni ne louons vos données personnelles à des tiers.
          </p>
        </Card>
        <Card className="p-5">
          <Database className="h-5 w-5 text-navy" />
          <h2 className="mt-3 font-semibold">Le strict nécessaire</h2>
          <p className="mt-1 text-sm text-muted">
            Seules les données utiles à votre entraînement sont collectées.
          </p>
        </Card>
        <Card className="p-5">
          <Download className="h-5 w-5 text-navy" />
          <h2 className="mt-3 font-semibold">Sous votre contrôle</h2>
          <p className="mt-1 text-sm text-muted">
            Export et suppression disponibles à tout moment depuis les réglages.
          </p>
        </Card>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="mt-12 space-y-10">
        <section>
          <h2 className="display text-2xl leading-tight">Les données que nous collectons</h2>
          <div className="mt-4 space-y-3">
            {COLLECTED.map((c) => (
              <div key={c.title} className="card p-5">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="display text-2xl leading-tight">Le mode invité</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Vous pouvez utiliser CapTCF sans créer de compte. En mode invité, votre progression est
            rattachée à un identifiant d'appareil stocké dans un cookie sur votre navigateur. Rien
            n'est associé à une identité personnelle. Si vous créez un compte plus tard, ces données
            d'invité sont automatiquement fusionnées avec votre compte, sans double saisie ni perte.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-navy" />
            <h2 className="display text-2xl leading-tight">Enregistrements vocaux</h2>
          </div>
          <p className="mt-4 leading-relaxed text-muted">
            Le module d'expression orale enregistre votre voix, après votre autorisation explicite
            du micro, dans le seul but de votre auto-évaluation. Ces enregistrements sont stockés de
            façon privée, ne servent qu'à vous restituer votre production et une estimation non
            officielle, ne sont jamais publiés ni vendus, et sont automatiquement supprimés lorsque
            vous supprimez votre compte. Vous pouvez refuser l'accès au micro : la tâche est alors
            simplement marquée comme non réalisée.
          </p>
        </section>

        <section>
          <h2 className="display text-2xl leading-tight">Comment nous utilisons vos données</h2>
          <ul className="mt-4 space-y-2.5 leading-relaxed text-ink">
            {[
              "Faire fonctionner l'entraînement et calculer votre maîtrise par compétence.",
              "Programmer la révision de vos erreurs au bon moment.",
              "Produire vos estimations de niveau, présentées comme non officielles.",
              "Sauvegarder et synchroniser votre progression si vous avez un compte.",
              "Assurer la sécurité du service et prévenir les abus.",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                {x}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-navy" />
            <h2 className="display text-2xl leading-tight">Les cookies</h2>
          </div>
          <p className="mt-4 leading-relaxed text-muted">
            Nous utilisons uniquement des cookies fonctionnels, essentiels au service. Nous ne
            posons pas de cookies publicitaires ni de traceurs tiers à des fins de profilage.
          </p>
          <div className="mt-5 overflow-x-auto rounded-[var(--radius)] border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    Cookie
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    Rôle
                  </th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((c) => (
                  <tr key={c.name} className="border-t border-border">
                    <th
                      scope="row"
                      className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink"
                    >
                      {c.name}
                    </th>
                    <td className="px-4 py-3 text-muted">{c.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="display text-2xl leading-tight">Vos droits</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-navy" />
                <h3 className="font-semibold">Exporter vos données</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Vous pouvez télécharger une copie de vos données depuis les réglages de votre compte
                à tout moment.
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-navy" />
                <h3 className="font-semibold">Supprimer votre compte</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                La suppression de votre compte efface vos données personnelles associées. L'action
                est disponible dans les réglages.
              </p>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="display text-2xl leading-tight">Conservation</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Nous conservons vos données tant que votre compte est actif ou que votre progression
            d'invité est présente sur votre appareil. Vous pouvez y mettre fin quand vous le
            souhaitez en supprimant votre compte ou les données de votre navigateur.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Alert tone="neutral">
          Cette page décrit les pratiques de confidentialité de CapTCF, un outil d'étude indépendant
          non affilié à France Éducation international ni à IRCC. Pour toute question, consultez la{" "}
          <Link href="/faq" className="font-medium underline">
            FAQ
          </Link>{" "}
          ou nos{" "}
          <Link href="/terms" className="font-medium underline">
            conditions d'utilisation
          </Link>
          .
        </Alert>
      </div>
    </div>
  );
}
