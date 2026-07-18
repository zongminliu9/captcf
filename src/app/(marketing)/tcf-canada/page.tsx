import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXAM_SPEC, SKILLS, type SkillId } from "@/lib/exam/config";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TCF Canada",
  description:
    "Qu'est-ce que le TCF Canada ? Objectif, public, structure des quatre épreuves et scores utilisés pour l'immigration, la résidence permanente et la citoyenneté.",
};

const SKILL_ICON: Record<SkillId, LucideIcon> = {
  listening: Headphones,
  reading: BookOpenText,
  writing: PenLine,
  speaking: Mic,
};

const USES = [
  {
    icon: Users,
    title: "Résidence permanente",
    body: "Entrée express et la plupart des programmes provinciaux exigent une preuve de compétence en français reconnue par IRCC.",
  },
  {
    icon: GraduationCap,
    title: "Immigration économique",
    body: "Le français peut apporter des points supplémentaires décisifs dans le calcul du score de classement global.",
  },
  {
    icon: ShieldCheck,
    title: "Citoyenneté",
    body: "Le TCF Canada peut servir de preuve linguistique dans le cadre d'une demande de citoyenneté canadienne.",
  },
];

export default function TcfCanadaPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <Badge variant="navy" size="lg" className="mb-5">
            <Sparkles className="h-3.5 w-3.5" /> L'examen expliqué simplement
          </Badge>
          <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Le TCF Canada, de A à Z</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Le Test de connaissance du français pour le Canada (TCF Canada) évalue votre niveau de
            français à l'écrit et à l'oral. Il est reconnu par Immigration, Réfugiés et Citoyenneté
            Canada (IRCC) comme preuve de compétence linguistique.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <a href="/practice/start?mode=quick">
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/diagnostic">Faire le test de diagnostic</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── What it is ───────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="display text-3xl leading-tight">À quoi sert cet examen ?</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          Le TCF Canada mesure quatre compétences distinctes : comprendre le français parlé,
          comprendre le français écrit, s'exprimer par écrit et s'exprimer à l'oral. Chaque épreuve
          est notée séparément, puis convertie en niveau NCLC (Niveaux de compétence linguistique
          canadiens) utilisé dans vos démarches.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {USES.map((u) => (
            <Card key={u.title} className="p-6" raised>
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50">
                <u.icon className="h-5 w-5 text-navy" />
              </div>
              <h3 className="mt-4 font-semibold">{u.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{u.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Four sections ────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-wide text-navy">
              La structure
            </div>
            <h2 className="display mt-2 text-3xl leading-tight">Quatre épreuves, deux formats</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Deux épreuves à choix multiples notées sur 699, et deux épreuves de production notées
              sur 20. Voici le détail de chacune.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SKILLS.map((s) => {
              const spec = EXAM_SPEC[s];
              const Icon = SKILL_ICON[s];
              const minutes = Math.round(spec.durationSeconds / 60);
              return (
                <Card key={s} className="flex flex-col p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50">
                      <Icon className="h-5 w-5 text-navy" />
                    </div>
                    <Badge variant="outline">{spec.code}</Badge>
                  </div>
                  <h3 className="mt-4 font-semibold">{spec.labelFr}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>
                      {spec.kind === "qcm"
                        ? `${spec.itemCount} questions`
                        : `${spec.itemCount} tâches`}
                    </span>
                    <span>{minutes} min</span>
                    <span>Noté sur {spec.scoreKind === "scale699" ? "699" : "20"}</span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {s === "listening" &&
                      "39 questions à choix multiple sur de courts enregistrements de difficulté croissante. Chaque document n'est entendu qu'une seule fois."}
                    {s === "reading" &&
                      "39 questions à choix multiple portant sur des documents écrits allant de l'affiche au texte argumentatif."}
                    {s === "writing" &&
                      "Trois tâches progressives : un message, un court récit ou article, puis une comparaison argumentée."}
                    {s === "speaking" &&
                      "Un entretien enregistré d'environ 12 minutes en trois temps : entretien dirigé, interaction et point de vue."}
                  </p>
                </Card>
              );
            })}
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href="/exam-format">
                Voir le format détaillé <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Scores ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="display text-3xl leading-tight">Comment lire vos scores</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          La compréhension orale et la compréhension écrite sont notées de 0 à 699. L'expression
          écrite et l'expression orale sont notées de 0 à 20. Ces scores se traduisent ensuite en
          niveaux NCLC. Pour l'immigration, votre niveau global correspond au minimum obtenu parmi
          les quatre compétences.
        </p>
        <ul className="mt-6 space-y-2.5">
          {[
            "NCLC 7 est le seuil le plus souvent demandé pour l'entrée express.",
            "Chaque compétence doit atteindre le niveau visé — un seul point faible tire le total vers le bas.",
            "Les niveaux se lisent de NCLC 4 à NCLC 10 et au-delà.",
          ].map((x) => (
            <li key={x} className="flex items-start gap-2.5 text-ink">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> {x}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/nclc">
              Table de conversion NCLC <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6">
        <Alert tone="warning" icon={<ShieldCheck className="h-4 w-4" />}>
          <p className="font-medium">CapTCF est un outil d'étude indépendant.</p>
          <p className="mt-1">
            Nous proposons du matériel d'entraînement original de style TCF Canada et des
            estimations de score non officielles, à titre indicatif. CapTCF n'est ni affilié ni
            approuvé par France Éducation international ni par IRCC. Seul un examen officiel passé
            dans un centre agréé délivre un résultat valable pour vos démarches.
          </p>
        </Alert>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="display text-3xl sm:text-4xl">Prêt à évaluer votre niveau ?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Faites votre première séance sans inscription et découvrez votre estimation NCLC en
            quelques minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <a href="/practice/start?mode=quick">
                Commencer maintenant <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/mock-tests">Voir les examens blancs</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
