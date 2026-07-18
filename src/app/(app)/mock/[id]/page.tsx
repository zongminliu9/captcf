import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { mockTests } from "@/db/schema";
import { getActor } from "@/lib/auth/session";
import { can } from "@/lib/entitlements";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { EXAM_SPEC } from "@/lib/exam/config";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, Clock, Headphones, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MockOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(mockTests).where(eq(mockTests.id, id)).limit(1);
  if (!form) notFound();

  const actor = await getActor();
  const plan = await getPlanForActor(actor);
  const locked = !form.isSample && !can(plan, "full_mock_tests");

  const sections = [
    { skill: "listening" as const, count: 39 },
    { skill: "reading" as const, count: 39 },
    { skill: "writing" as const, count: 3 },
    { skill: "speaking" as const, count: 3 },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="navy">Examen blanc</Badge>
        {form.isSample && <Badge variant="success">Gratuit</Badge>}
      </div>
      <h1 className="display text-3xl">{form.title}</h1>
      <p className="mt-2 text-muted">{form.description}</p>

      <div className="mt-6 space-y-3">
        {sections.map((s) => {
          const spec = EXAM_SPEC[s.skill];
          return (
            <Card key={s.skill} className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-navy-50 text-navy">
                {spec.code}
              </div>
              <div className="flex-1">
                <div className="font-medium">{spec.labelFr}</div>
                <div className="text-sm text-muted">
                  {spec.kind === "qcm" ? `${spec.itemCount} questions` : `${spec.itemCount} tâches`}{" "}
                  · {Math.round(spec.durationSeconds / 60)} min
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Alert tone="info" className="mt-5" icon={<Headphones className="h-4 w-4" />}>
        Examen complet en 4 épreuves enchaînées dans une seule session : écoute, lecture, écrit et
        oral. Chaque épreuve est chronométrée séparément (le chrono ne se réinitialise pas si vous
        rechargez la page). Écoute et lecture sont corrigées automatiquement ; écrit et oral
        reçoivent une auto-évaluation locale. Le tout forme un bilan unique.
      </Alert>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {locked ? (
          <Button asChild variant="primary">
            <Link href="/pricing?reason=mock">Débloquer avec Premium</Link>
          </Button>
        ) : (
          <Button asChild variant="primary">
            {/* plain <a> so the route handler can set the guest cookie */}
            <a href={`/mock/${form.id}/begin`}>
              <Clock className="h-4 w-4" /> Commencer l'examen complet <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
        <Info className="h-3.5 w-3.5" /> Structure conforme à la version {form.specVersion} de
        l'examen.
      </p>
    </div>
  );
}
