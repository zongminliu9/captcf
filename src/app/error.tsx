"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // client-side breadcrumb; server logs capture the full error
    console.error("app error boundary:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="display text-2xl">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Quelque chose s'est mal passé. Vous pouvez réessayer ; votre progression est enregistrée.
      </p>
      {error.digest && <p className="mt-1 font-mono text-xs text-faint">réf. {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
