import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { mockTests } from "@/db/schema";
import { getActor } from "@/lib/auth/session";
import { can } from "@/lib/entitlements";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { EXAM_SPEC } from "@/lib/exam/config";
import { asc } from "drizzle-orm";
import { ClipboardList, Clock, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Examens blancs" };

export default async function MockListPage() {
  const actor = await getActor();
  const plan = await getPlanForActor(actor);
  const forms = await db.select().from(mockTests).orderBy(asc(mockTests.formNumber));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-navy" />
        <h1 className="display text-3xl">Examens blancs</h1>
      </div>
      <p className="mb-8 max-w-2xl text-muted">
        Quatre examens complets conformes à la structure officielle. Chronomètre fidèle par section,
        audio joué un nombre limité de fois, aucune réponse dévoilée avant la fin. Recharger la page
        ne remet jamais le chronomètre à zéro.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {forms.map((form) => {
          const locked = !form.isSample && !can(plan, "full_mock_tests");
          return (
            <Card key={form.id} className="flex flex-col p-5" raised={form.isSample}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{form.title}</h2>
                {form.isSample ? (
                  <Badge variant="success" size="sm">
                    Gratuit
                  </Badge>
                ) : (
                  <Badge variant={locked ? "neutral" : "navy"} size="sm">
                    Premium
                  </Badge>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">
                39 écoute · 39 lecture · 3 écrit · 3 oral
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <Clock className="h-3.5 w-3.5" />
                {Math.round(
                  (EXAM_SPEC.listening.durationSeconds +
                    EXAM_SPEC.reading.durationSeconds +
                    EXAM_SPEC.writing.durationSeconds +
                    EXAM_SPEC.speaking.durationSeconds) /
                    60,
                )}{" "}
                min au total
              </div>
              <div className="mt-4">
                {locked ? (
                  <Link
                    href="/pricing?reason=mock"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
                  >
                    <Lock className="h-4 w-4" /> Débloquer avec Premium
                  </Link>
                ) : (
                  <Link
                    href={`/mock/${form.id}`}
                    className="text-sm font-medium text-navy hover:underline"
                  >
                    Voir l'examen →
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
