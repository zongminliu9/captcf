import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Wordmark />
      <p className="display mt-8 text-6xl font-semibold text-navy">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Cette page n'existe pas ou a été déplacée. Reprenez votre préparation depuis le tableau de
        bord ou l'accueil.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/">Accueil</Link>
        </Button>
        <Button asChild variant="primary">
          <Link href="/dashboard">Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
