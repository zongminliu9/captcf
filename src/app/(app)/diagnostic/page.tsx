import { ArrowRight, BookOpenText, Headphones, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test de diagnostic" };

export default function DiagnosticPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-8" raised>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          <Sparkles className="h-7 w-7 text-navy" />
        </div>
        <h1 className="display text-center text-2xl">Test de diagnostic</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Une douzaine de questions d'écoute et de lecture, de difficulté progressive, pour situer
          votre niveau et repérer vos points faibles. Environ 8 à 12 minutes.
        </p>

        <ul className="mt-6 space-y-3">
          {[
            { icon: Headphones, text: "Compréhension orale avec audio réel" },
            { icon: BookOpenText, text: "Compréhension écrite de tous niveaux" },
            { icon: Timer, text: "Estimation CEFR / NCLC en fin de test" },
          ].map((x) => (
            <li key={x.text} className="flex items-center gap-3 text-sm text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                <x.icon className="h-4 w-4 text-navy" />
              </span>
              {x.text}
            </li>
          ))}
        </ul>

        <Button asChild variant="primary" className="mt-7 w-full">
          {/* plain <a> so the route handler can create the guest session */}
          <a href="/practice/start?mode=diagnostic">
            Commencer le diagnostic <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <p className="mt-3 text-center text-xs text-faint">
          Aucun compte requis. L'estimation affichée est non officielle.
        </p>
      </Card>
    </div>
  );
}
