"use client";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const NAV: { href: string; key: string }[] = [
  { href: "/exam-format", key: "nav.format" },
  { href: "/nclc", key: "nav.nclc" },
  { href: "/practice", key: "nav.practice" },
  { href: "/mock-tests", key: "nav.mocks" },
  { href: "/pricing", key: "nav.pricing" },
  { href: "/faq", key: "nav.faq" },
];

export function SiteHeaderClient({ authed }: { authed: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="CapTCF" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principale">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            {authed ? (
              <Button asChild size="sm" variant="primary">
                <Link href="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">{t("cta.login")}</Link>
                </Button>
                <Button asChild size="sm" variant="primary">
                  <Link href="/register">{t("cta.register")}</Link>
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-ink hover:bg-surface-2 lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-canvas lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] px-3 py-2.5 text-[0.95rem] text-ink hover:bg-surface-2"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              {authed ? (
                <Button asChild variant="primary" className="flex-1">
                  <Link href="/dashboard">{t("nav.dashboard")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/login">{t("cta.login")}</Link>
                  </Button>
                  <Button asChild variant="primary" className="flex-1">
                    <Link href="/register">{t("cta.register")}</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
