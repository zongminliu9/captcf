import Link from "next/link";
import { Wordmark } from "@/components/brand";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { href: "/practice", label: "S'entraîner" },
      { href: "/mock-tests", label: "Examens blancs" },
      { href: "/diagnostic", label: "Test de diagnostic" },
      { href: "/pricing", label: "Tarifs" },
    ],
  },
  {
    title: "L'examen",
    links: [
      { href: "/tcf-canada", label: "TCF Canada" },
      { href: "/exam-format", label: "Format de l'examen" },
      { href: "/nclc", label: "Niveaux NCLC" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/login", label: "Se connecter" },
      { href: "/register", label: "Créer un compte" },
      { href: "/dashboard", label: "Tableau de bord" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/privacy", label: "Confidentialité" },
      { href: "/terms", label: "Conditions" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Un outil d'étude indépendant proposant du matériel d'entraînement original de
              style TCF Canada et des estimations non officielles.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-faint">
          <p>
            CapTCF n'est pas affilié à France Éducation international ni à IRCC. « TCF » et « TCF
            Canada » sont des marques de leurs propriétaires respectifs, citées uniquement à des
            fins descriptives. Le matériel proposé est original et les estimations de score sont
            non officielles.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} CapTCF.</p>
        </div>
      </div>
    </footer>
  );
}
