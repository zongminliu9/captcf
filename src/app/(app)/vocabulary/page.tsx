import { Badge, cefrVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { vocabularyItems } from "@/db/schema";
import { CEFR_LEVELS } from "@/lib/exam/config";
import { asc, sql } from "drizzle-orm";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

const SHOWN_LIMIT = 120;

type VocabRow = {
  id: string;
  term: string;
  partOfSpeech: string;
  cefrLevel: string;
  glossEn: string;
  glossZh: string;
  exampleFr: string;
};

export default async function VocabularyPage() {
  const [totalRow, items] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(vocabularyItems),
    db
      .select({
        id: vocabularyItems.id,
        term: vocabularyItems.term,
        partOfSpeech: vocabularyItems.partOfSpeech,
        cefrLevel: vocabularyItems.cefrLevel,
        glossEn: vocabularyItems.glossEn,
        glossZh: vocabularyItems.glossZh,
        exampleFr: vocabularyItems.exampleFr,
      })
      .from(vocabularyItems)
      .orderBy(asc(vocabularyItems.cefrLevel), asc(vocabularyItems.term))
      .limit(SHOWN_LIMIT),
  ]);

  const total = totalRow[0]?.n ?? 0;
  const grouped = new Map<string, VocabRow[]>();
  for (const it of items) {
    const arr = grouped.get(it.cefrLevel) ?? [];
    arr.push(it);
    grouped.set(it.cefrLevel, arr);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Badge variant="navy">Vocabulaire</Badge>
        {total > 0 && (
          <Badge variant="outline" size="sm">
            {total} terme(s)
          </Badge>
        )}
      </div>
      <h1 className="display mt-2 flex items-center gap-2 text-3xl">
        <GraduationCap className="h-7 w-7 text-navy" aria-hidden />
        Banque de vocabulaire
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Parcourez le vocabulaire clé de l'examen, organisé par niveau CECR. Chaque terme est
        accompagné de sa traduction et d'un exemple en contexte.
      </p>

      {total === 0 ? (
        <Card className="mt-6 p-6 text-sm text-muted">
          Le vocabulaire n'est pas encore disponible. Revenez bientôt : la banque est en cours de
          préparation.
        </Card>
      ) : (
        <>
          {items.length < total && (
            <p className="mt-4 text-xs text-faint">
              Affichage des {items.length} premiers termes sur {total}.
            </p>
          )}

          <div className="mt-6 space-y-10">
            {CEFR_LEVELS.map((level) => {
              const rows = grouped.get(level);
              if (!rows || rows.length === 0) return null;
              return (
                <section key={level} aria-labelledby={`vocab-${level}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant={cefrVariant(level)}>{level}</Badge>
                    <h2 id={`vocab-${level}`} className="text-lg font-semibold">
                      Niveau {level}
                    </h2>
                    <span className="text-sm text-muted">· {rows.length} terme(s)</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((v) => (
                      <Card key={v.id} className="flex flex-col gap-2 p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-ink">{v.term}</span>
                          <span className="shrink-0 text-xs italic text-faint">
                            {v.partOfSpeech}
                          </span>
                        </div>
                        <div className="text-sm text-muted">
                          {v.glossEn}
                          {v.glossZh && <span className="text-faint"> · {v.glossZh}</span>}
                        </div>
                        {v.exampleFr && (
                          <p className="mt-1 border-l-2 border-border pl-2 text-sm italic text-ink">
                            {v.exampleFr}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
