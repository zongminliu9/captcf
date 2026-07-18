"use client";
import {
  BarChart3,
  BookMarked,
  BookOpenText,
  ClipboardList,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  ListChecks,
  Mic,
  PenLine,
  Repeat,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface ShellData {
  authed: boolean;
  isAdmin: boolean;
  plan: "free" | "premium";
  dueCount: number;
  name: string | null;
  email: string | null;
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  badge?: number;
}

const FOCUS_RE =
  /^\/(practice\/session|mock\/run\/|diagnostic|onboarding|writing\/[^/]+$|speaking\/[^/]+$)/;

export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const router = useRouter();
  const focus = FOCUS_RE.test(pathname);

  const primary: NavItem[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
    { href: "/practice", labelKey: "nav.practice", icon: Target },
    { href: "/listening", labelKey: "nav.listening", icon: Headphones },
    { href: "/reading", labelKey: "nav.reading", icon: BookOpenText },
    { href: "/writing", labelKey: "nav.writing", icon: PenLine },
    { href: "/speaking", labelKey: "nav.speaking", icon: Mic },
    { href: "/mock", labelKey: "nav.mocks", icon: ClipboardList },
    { href: "/review", labelKey: "nav.review", icon: Repeat, badge: data.dueCount },
    { href: "/progress", labelKey: "nav.progress", icon: BarChart3 },
  ];
  const secondary: NavItem[] = [
    { href: "/mistakes", labelKey: "nav.mistakes", icon: ListChecks },
    { href: "/bookmarks", labelKey: "nav.bookmarks", icon: BookMarked },
    { href: "/vocabulary", labelKey: "nav.vocabulary", icon: GraduationCap },
    { href: "/study-plan", labelKey: "nav.plan", icon: Sparkles },
    { href: "/settings", labelKey: "nav.settings", icon: Settings },
  ];
  if (data.isAdmin) secondary.push({ href: "/admin", labelKey: "nav.admin", icon: ShieldCheck });

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  if (focus) {
    return (
      <div className="min-h-dvh">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-canvas/90 px-4 backdrop-blur-md">
          <Link href="/dashboard" aria-label="Quitter" className="flex items-center">
            <Wordmark size={26} />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <main id="main">{children}</main>
      </div>
    );
  }

  const bottomNav = [primary[0]!, primary[1]!, primary[6]!, primary[7]!, primary[8]!];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="CapTCF">
            <Wordmark />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navigation">
          {primary.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} label={t(item.labelKey)} />
          ))}
          <div className="my-3 border-t border-border" />
          {secondary.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} label={t(item.labelKey)} />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <PlanCard plan={data.plan} />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
          <Link href="/dashboard" className="lg:hidden" aria-label="CapTCF">
            <Wordmark size={28} />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            {data.authed ? (
              <Link
                href="/settings"
                className="ml-1 flex h-9 items-center gap-2 rounded-full bg-surface-2 pl-1 pr-3 text-sm hover:bg-surface-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-on-navy">
                  {(data.name ?? data.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {data.name ?? data.email}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="ml-1 h-9 rounded-[var(--radius-sm)] bg-navy px-3.5 text-sm font-medium text-on-navy hover:bg-navy-600"
              >
                {t("cta.register")}
              </button>
            )}
          </div>
        </header>

        {!data.authed && <GuestBanner />}
        <main id="main" className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
        aria-label="Navigation mobile"
      >
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[0.7rem]",
                active ? "text-navy" : "text-muted",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.badge ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6rem] font-semibold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-navy-50 text-navy" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
      {item.badge ? (
        <Badge variant="accent" size="sm">
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

function PlanCard({ plan }: { plan: "free" | "premium" }) {
  const t = useT();
  if (plan === "premium") {
    return (
      <div className="rounded-[var(--radius-sm)] bg-navy-50 px-3 py-2.5 text-sm">
        <div className="flex items-center gap-1.5 font-medium text-navy">
          <Sparkles className="h-4 w-4" /> {t("common.premium")}
        </div>
        <p className="mt-0.5 text-xs text-muted">Accès complet activé.</p>
      </div>
    );
  }
  return (
    <Link
      href="/pricing"
      className="block rounded-[var(--radius-sm)] border border-border-strong px-3 py-2.5 text-sm hover:bg-surface-2"
    >
      <div className="font-medium text-ink">Passez à Premium</div>
      <p className="mt-0.5 text-xs text-muted">Examens blancs illimités et analyses avancées.</p>
    </Link>
  );
}

function GuestBanner() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-navy-50 px-4 py-2 text-center text-sm text-navy">
      <span>Mode invité — votre progression est enregistrée sur cet appareil.</span>
      <Link href="/register" className="font-semibold underline underline-offset-2">
        {t("cta.register")}
      </Link>
    </div>
  );
}
