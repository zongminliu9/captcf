import { and, eq, lte, sql } from "drizzle-orm";
import {
  ArrowRight,
  BookMarked,
  BookOpenText,
  Headphones,
  ListChecks,
  Repeat,
  Sliders,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { bookmarks, mistakes, reviewQueue } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface ModeCard {
  href: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  count?: number;
  countTone?: "navy" | "gold";
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const actor = await getActor();

  let mistakeCount = 0;
  let bookmarkCount = 0;
  let dueCount = 0;
  if (actor) {
    const [m, b, d] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(mistakes)
        .where(and(ownerEq(mistakes, actor), eq(mistakes.resolved, false))),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(ownerEq(bookmarks, actor)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(reviewQueue)
        .where(and(ownerEq(reviewQueue, actor), lte(reviewQueue.dueAt, new Date()))),
    ]);
    mistakeCount = m[0]?.n ?? 0;
    bookmarkCount = b[0]?.n ?? 0;
    dueCount = d[0]?.n ?? 0;
  }

  const modes: ModeCard[] = [
    {
      href: "/practice/start?mode=quick",
      title: "Séance rapide",
      desc: "8 questions mêlant écoute et lecture pour un entraînement express.",
      Icon: Zap,
    },
    {
      href: "/practice/start?mode=listening",
      title: "Compréhension orale",
      desc: "10 questions d'écoute adaptées à votre niveau.",
      Icon: Headphones,
    },
    {
      href: "/practice/start?mode=reading",
      title: "Compréhension écrite",
      desc: "10 questions de lecture de difficulté progressive.",
      Icon: BookOpenText,
    },
    {
      href: "/practice/start?mode=mistakes",
      title: "Mes erreurs",
      desc: "Revoyez les questions déjà manquées jusqu'à les maîtriser.",
      Icon: ListChecks,
      count: mistakeCount,
      countTone: "navy",
    },
    {
      href: "/practice/start?mode=bookmarks",
      title: "Mes favoris",
      desc: "Entraînez-vous sur les questions mises de côté.",
      Icon: BookMarked,
      count: bookmarkCount,
      countTone: "navy",
    },
    {
      href: "/practice/start?mode=review",
      title: "À réviser",
      desc: "Vos révisions espacées du jour, planifiées automatiquement.",
      Icon: Repeat,
      count: dueCount,
      countTone: "gold",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Badge variant="navy">Entraînement</Badge>
      <h1 className="display mt-2 text-3xl">Choisissez un mode d'entraînement</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Chaque séance est adaptée à votre niveau et vous donne un retour immédiat, question après
        question.
      </p>

      {empty === "1" && (
        <Alert tone="warning" className="mt-6">
          Il n'y a rien à travailler dans ce mode pour l'instant. Faites d'abord quelques questions —
          vos erreurs, favoris et révisions apparaîtront ici au fil de l'eau.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map((m) => (
          <a
            key={m.href}
            href={m.href}
            className="card card-raised group flex flex-col gap-4 p-5 transition hover:border-border-strong"
          >
            <div className="flex items-start justify-between">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy"
                aria-hidden
              >
                <m.Icon className="h-5 w-5" />
              </span>
              {m.count != null && m.count > 0 && (
                <Badge variant={m.countTone ?? "navy"} size="sm">
                  {m.count} en attente
                </Badge>
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-ink">{m.title}</h2>
              <p className="mt-1 text-sm text-muted">{m.desc}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-navy">
              Commencer
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </a>
        ))}
      </div>

      <a
        href="/practice/custom"
        className="card card-raised group mt-4 flex flex-col gap-4 p-5 transition hover:border-border-strong sm:flex-row sm:items-center"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-50 text-gold"
          aria-hidden
        >
          <Sliders className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-ink">Entraînement personnalisé</h2>
          <p className="mt-1 text-sm text-muted">
            Composez votre séance : compétences, niveaux CECR, thèmes, nombre de questions et minuteur.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-navy">
          Configurer
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </a>
    </div>
  );
}
