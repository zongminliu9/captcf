import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileText, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Les conditions d'utilisation de CapTCF : outil d'étude indépendant, matériel original, estimations non officielles, usage acceptable et service fourni « en l'état ».",
};

const LAST_UPDATED = "18 juillet 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. À propos du service",
    body: (
      <p>
        CapTCF est un outil d'étude indépendant destiné à préparer le TCF Canada. En utilisant le
        service, vous acceptez les présentes conditions. Si vous n'êtes pas d'accord avec l'une
        d'elles, veuillez ne pas utiliser CapTCF.
      </p>
    ),
  },
  {
    title: "2. Indépendance et absence d'affiliation",
    body: (
      <p>
        CapTCF n'est ni affilié, ni approuvé, ni sponsorisé par France Éducation international ni
        par Immigration, Réfugiés et Citoyenneté Canada (IRCC). Les marques « TCF » et « TCF Canada
        » appartiennent à leurs propriétaires respectifs et ne sont citées qu'à des fins
        descriptives.
      </p>
    ),
  },
  {
    title: "3. Matériel d'entraînement",
    body: (
      <p>
        Les questions, textes, enregistrements et corrigés proposés sont des contenus originaux
        créés pour CapTCF, de style TCF Canada. Ils ne reproduisent pas les sujets officiels de
        l'examen. Ce matériel est réservé à votre usage personnel d'apprentissage.
      </p>
    ),
  },
  {
    title: "4. Estimations non officielles",
    body: (
      <p>
        Les scores, niveaux CEFR et niveaux NCLC affichés dans l'application sont des estimations
        indicatives, calculées à partir de vos réponses. Ils ne constituent en aucun cas un résultat
        officiel et ne préjugent pas de votre performance à l'examen réel. Seul un examen passé dans
        un centre agréé délivre un résultat valable pour vos démarches.
      </p>
    ),
  },
  {
    title: "5. Aucune garantie de résultat",
    body: (
      <p>
        CapTCF est un outil de préparation. Nous ne garantissons l'obtention d'aucun score, d'aucun
        niveau NCLC ni d'aucune issue de vos démarches d'immigration. Votre progression dépend de
        nombreux facteurs qui vous sont propres.
      </p>
    ),
  },
  {
    title: "6. Votre compte",
    body: (
      <p>
        Un compte est facultatif : vous pouvez utiliser le service en mode invité. Si vous créez un
        compte, vous êtes responsable de l'exactitude des informations fournies et de la
        confidentialité de vos identifiants. Prévenez-nous en cas d'utilisation non autorisée.
      </p>
    ),
  },
  {
    title: "7. Usage acceptable",
    body: (
      <p>
        Vous vous engagez à ne pas copier, revendre ou redistribuer le contenu, à ne pas tenter
        d'extraire massivement les données, à ne pas perturber le fonctionnement du service ni à
        contourner ses limites d'accès. Tout usage abusif peut entraîner la suspension de l'accès.
      </p>
    ),
  },
  {
    title: "8. Offres et paiement",
    body: (
      <p>
        Le service propose une offre gratuite et une offre Premium. Les fonctionnalités de chaque
        offre sont décrites sur la page des tarifs. En environnement de développement, le passage à
        Premium peut utiliser un simulateur de paiement, sans transaction réelle.
      </p>
    ),
  },
  {
    title: "9. Propriété intellectuelle",
    body: (
      <p>
        L'ensemble des contenus, de la marque CapTCF et du logiciel demeure la propriété de CapTCF
        ou de ses concédants. Aucune disposition des présentes ne vous transfère de droit de
        propriété sur ces éléments.
      </p>
    ),
  },
  {
    title: "10. Service fourni « en l'état »",
    body: (
      <p>
        Le service est fourni « en l'état » et « selon disponibilité », sans garantie d'absence
        d'erreur ni de disponibilité ininterrompue. Dans les limites permises par la loi, notre
        responsabilité ne saurait être engagée pour les conséquences de vos décisions fondées sur
        les estimations fournies.
      </p>
    ),
  },
  {
    title: "11. Modifications",
    body: (
      <p>
        Nous pouvons faire évoluer le service et les présentes conditions. En cas de changement
        important, nous mettrons à jour la date ci-dessus. La poursuite de l'utilisation vaut
        acceptation des conditions révisées.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <Scale className="h-3.5 w-3.5" /> Cadre d'utilisation
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Conditions d'utilisation</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Des règles simples et honnêtes pour utiliser CapTCF. En résumé : un outil d'étude
          indépendant, du matériel original et des estimations non officielles.
        </p>
        <p className="mt-3 text-sm text-faint">Dernière mise à jour : {LAST_UPDATED}</p>
      </header>

      {/* ── Sections ──────────────────────────────────────────── */}
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-navy" />
              <h2 className="text-lg font-semibold">{s.title}</h2>
            </div>
            <div className="mt-2 pl-6 leading-relaxed text-muted">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-12">
        <Alert tone="neutral">
          Ces conditions complètent notre{" "}
          <Link href="/privacy" className="font-medium underline">
            politique de confidentialité
          </Link>
          . Pour toute question sur le fonctionnement du service, consultez la{" "}
          <Link href="/faq" className="font-medium underline">
            FAQ
          </Link>
          .
        </Alert>
      </div>
    </div>
  );
}
