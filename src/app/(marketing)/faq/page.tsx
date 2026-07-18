import { ArrowRight, ChevronDown, HelpCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_SPEC } from "@/lib/exam/config";
import { PLAN_LIMITS } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions fréquentes sur le TCF Canada et sur CapTCF : officialité, compte, estimation des scores, audio, examens blancs, offres et confidentialité.",
};

const FREE_DAILY = PLAN_LIMITS.free.practiceSessionsPerDay;
const listening = EXAM_SPEC.listening.itemCount;
const reading = EXAM_SPEC.reading.itemCount;

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Qu'est-ce que le TCF Canada ?",
    a: (
      <p>
        C'est le Test de connaissance du français pour le Canada. Il évalue quatre compétences —
        compréhension orale, compréhension écrite, expression écrite et expression orale — et sert
        de preuve linguistique reconnue par IRCC pour l'immigration, la résidence permanente et la
        citoyenneté.
      </p>
    ),
  },
  {
    q: "CapTCF est-il un examen officiel ou affilié à IRCC ?",
    a: (
      <p>
        Non. CapTCF est un outil d'étude indépendant. Nous ne sommes ni affiliés ni approuvés par
        France Éducation international ni par IRCC. Notre matériel est original et de style TCF
        Canada, et nos estimations de score sont non officielles. Seul un examen passé dans un
        centre agréé délivre un résultat valable pour vos démarches.
      </p>
    ),
  },
  {
    q: "Ai-je besoin d'un compte pour commencer ?",
    a: (
      <p>
        Non. Vous pouvez vous entraîner immédiatement en mode invité, sans inscription. Votre
        progression est conservée sur votre appareil. Lorsque vous créez un compte plus tard, vos
        données d'invité sont automatiquement fusionnées, sans rien perdre.
      </p>
    ),
  },
  {
    q: "Comment les scores sont-ils estimés ?",
    a: (
      <p>
        Nos estimations s'appuient sur la difficulté des questions (niveau CEFR) et sur vos réponses
        pour projeter un score par compétence, puis un niveau NCLC. La conversion en NCLC suit les
        tables officielles d'IRCC, mais l'estimation elle-même reste indicative : elle vous situe et
        mesure vos progrès, elle ne prédit pas votre note officielle.
      </p>
    ),
  },
  {
    q: "L'audio de la compréhension orale est-il réel ?",
    a: (
      <p>
        Oui. Chaque question de compréhension orale s'accompagne d'un véritable enregistrement
        audio, généré pour l'application. En examen blanc, l'audio suit les règles officielles :
        chaque document n'est joué qu'une seule fois.
      </p>
    ),
  },
  {
    q: "Combien y a-t-il d'examens blancs ?",
    a: (
      <p>
        Quatre examens blancs complets (Examen blanc 1 à 4), chacun reproduisant la structure
        officielle : {listening} questions d'écoute, {reading} questions de lecture, 3 tâches
        d'expression écrite et 3 tâches d'expression orale. Le premier est proposé gratuitement en
        guise d'aperçu.
      </p>
    ),
  },
  {
    q: "Quelle différence entre l'offre gratuite et l'offre Premium ?",
    a: (
      <p>
        L'offre gratuite permet jusqu'à {FREE_DAILY} séances d'entraînement par jour, un accès limité
        à la banque de questions et un examen blanc d'essai. L'offre Premium débloque l'entraînement
        illimité, les quatre examens blancs, les analyses avancées, le retour par IA et le plan
        d'étude complet. Le détail figure sur la page{" "}
        <Link href="/pricing" className="font-medium text-navy hover:underline">
          Tarifs
        </Link>
        .
      </p>
    ),
  },
  {
    q: "Comment fonctionne la révision de mes erreurs ?",
    a: (
      <p>
        Chaque erreur et chaque mot de vocabulaire à retenir sont réinjectés au bon moment grâce à
        un algorithme de répétition espacée. Vous ne perdez pas de temps à revoir ce que vous
        maîtrisez déjà : le système privilégie ce qui vous fera progresser le plus.
      </p>
    ),
  },
  {
    q: "Le TCF Canada peut-il se préparer sur mobile ?",
    a: (
      <p>
        Oui. L'application est pensée pour fonctionner aussi bien sur ordinateur que sur téléphone.
        Vos séances courtes se prêtent particulièrement bien à un entraînement en déplacement.
      </p>
    ),
  },
  {
    q: "Que deviennent mes données personnelles ?",
    a: (
      <p>
        Nous collectons uniquement ce qui sert à faire fonctionner l'entraînement : vos réponses,
        votre maîtrise et, si vous vous inscrivez, votre adresse e-mail. Nous ne vendons pas vos
        données. Vous pouvez les exporter ou supprimer votre compte depuis les réglages. Voir la{" "}
        <Link href="/privacy" className="font-medium text-navy hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>
    ),
  },
  {
    q: "Combien de temps faut-il pour être prêt ?",
    a: (
      <p>
        Cela dépend de votre niveau de départ et de votre objectif NCLC. Commencez par le test de
        diagnostic : il situe votre niveau par compétence et vous indique l'écart avec votre
        objectif, afin de bâtir un plan réaliste.
      </p>
    ),
  },
  {
    q: "Puis-je m'entraîner sur une seule compétence ?",
    a: (
      <p>
        Oui. Vous pouvez cibler la compréhension orale, la compréhension écrite, l'expression écrite
        ou l'expression orale indépendamment, ou laisser le système choisir la séance la plus utile
        pour vous à l'instant T.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <HelpCircle className="h-3.5 w-3.5" /> Questions fréquentes
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Vos questions, nos réponses</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Tout ce qu'il faut savoir sur le TCF Canada et sur le fonctionnement de CapTCF.
        </p>
      </header>

      {/* ── Accordion ─────────────────────────────────────────── */}
      <div className="mt-10 space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group card overflow-hidden [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-ink">
              {item.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted">
              {item.a}
            </div>
          </details>
        ))}
      </div>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <div className="mt-12 rounded-[var(--radius)] border border-border bg-surface p-6 text-center sm:p-8">
        <h2 className="display text-2xl">Une autre question ?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Le plus simple est souvent d'essayer. Lancez une séance gratuite et voyez par vous-même.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="primary">
            <a href="/practice/start?mode=quick">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tcf-canada">En savoir plus sur l'examen</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
