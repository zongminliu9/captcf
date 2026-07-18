import { ArrowRight, Award, Info, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, cefrVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NCLC_TABLE, NCLC_TABLE_VERSION } from "@/lib/exam/nclc";

export const metadata: Metadata = {
  title: "Niveaux NCLC",
  description:
    "Comprendre les Niveaux de compétence linguistique canadiens (NCLC / CLB) et la table officielle de conversion des scores du TCF Canada, épreuve par épreuve.",
};

const EXPRESS_ENTRY_NCLC = 7;

function range([lo, hi]: readonly [number, number]): string {
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

export default function NclcPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <Badge variant="navy" size="lg" className="mb-5">
          <Layers className="h-3.5 w-3.5" /> Échelle de niveaux
        </Badge>
        <h1 className="display text-4xl leading-[1.1] sm:text-5xl">Les niveaux NCLC</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Les Niveaux de compétence linguistique canadiens (NCLC, ou CLB en anglais) sont l'échelle
          officielle qu'utilise IRCC pour mesurer votre français. Vos scores au TCF Canada sont
          convertis en niveaux NCLC, de 4 à 10 et au-delà.
        </p>
      </header>

      {/* ── Explainer cards ───────────────────────────────────── */}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Card className="p-6">
          <h2 className="font-semibold">Un niveau par compétence</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Chacune des quatre épreuves reçoit son propre niveau NCLC : compréhension orale,
            compréhension écrite, expression écrite et expression orale.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Le minimum l'emporte</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Pour l'immigration, votre niveau global correspond au plus bas des quatre. Une seule
            compétence faible limite l'ensemble de votre dossier.
          </p>
        </Card>
        <Card className="p-6" raised>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            <h2 className="font-semibold">NCLC 7, le seuil courant</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            NCLC 7 dans les quatre compétences est le seuil le plus souvent demandé pour l'entrée
            express. Vérifiez toujours l'exigence propre à votre programme.
          </p>
        </Card>
      </div>

      {/* ── Conversion table ──────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="display text-2xl leading-tight">Table de conversion officielle</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Compréhension orale et écrite sur l'échelle 0–699 ; expression écrite et orale sur
          l'échelle 0–20. Le niveau CEFR équivalent est indiqué à titre de repère.
        </p>

        <div className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <caption className="sr-only">
              Conversion des scores du TCF Canada en niveaux NCLC, par compétence
            </caption>
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  NCLC
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Compréhension orale
                  <span className="block text-xs font-normal text-muted">0–699</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Compréhension écrite
                  <span className="block text-xs font-normal text-muted">0–699</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Expression écrite
                  <span className="block text-xs font-normal text-muted">0–20</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Expression orale
                  <span className="block text-xs font-normal text-muted">0–20</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  CEFR
                </th>
              </tr>
            </thead>
            <tbody>
              {NCLC_TABLE.map((row) => {
                const highlight = row.nclc === EXPRESS_ENTRY_NCLC;
                return (
                  <tr
                    key={row.nclc}
                    className={`border-t border-border ${highlight ? "bg-gold-50" : ""}`}
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-4 py-3 text-left font-semibold text-navy"
                    >
                      <span className="inline-flex items-center gap-2">
                        NCLC {row.nclc}
                        {row.nclc === 10 && (
                          <span className="text-xs font-normal text-muted">et plus</span>
                        )}
                        {highlight && (
                          <Badge variant="gold" size="sm">
                            Entrée express
                          </Badge>
                        )}
                      </span>
                    </th>
                    <td className="px-4 py-3 tabular-nums text-ink">{range(row.listening)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink">{range(row.reading)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink">{range(row.writing)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink">{range(row.speaking)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cefrVariant(row.cefr)} size="sm">
                        {row.cefr}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-faint">
          Les scores en dessous de NCLC 4 ne sont pas convertis en niveau NCLC utilisable pour
          l'immigration. La ligne NCLC 10 couvre « 10 et au-dessus ».
        </p>
      </section>

      {/* ── Worked example ────────────────────────────────────── */}
      <section className="mt-12">
        <Card className="p-6 sm:p-7" raised>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-navy" />
            <h2 className="font-semibold">Un exemple concret</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Imaginons ces résultats : compréhension orale 470 (NCLC 7), compréhension écrite 460
            (NCLC 7), expression écrite 11 (NCLC 7) et expression orale 9 (NCLC 6). Puisque le
            niveau global correspond au minimum, ce candidat obtient un profil global de{" "}
            <span className="font-semibold text-ink">NCLC 6</span> — l'oral tire l'ensemble vers le
            bas. C'est exactement le type de point faible que CapTCF vous aide à repérer et à
            travailler en priorité.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline">
              <a href="/practice/start?mode=quick">
                Cibler ma compétence la plus faible <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────── */}
      <div className="mt-12">
        <Alert tone="warning">
          Les fourchettes de conversion ci-dessus reflètent les tables officielles publiées par IRCC
          (référence {NCLC_TABLE_VERSION}). En revanche, les estimations de score calculées dans
          l'application CapTCF sont non officielles et fournies à titre indicatif : seul un examen
          officiel délivre un résultat valable pour vos démarches.
        </Alert>
      </div>
    </div>
  );
}
