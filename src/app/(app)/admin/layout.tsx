import { requireAdmin } from "@/lib/auth/admin";
import { FileUp, Headphones, LayoutList, ListChecks, ShieldCheck } from "lucide-react";
import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble", icon: ShieldCheck },
  { href: "/admin/questions", label: "Questions", icon: LayoutList },
  { href: "/admin/audio", label: "Audio QA", icon: Headphones },
  { href: "/admin/import", label: "Importer", icon: FileUp },
  { href: "/admin/reports", label: "Signalements", icon: ListChecks },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-navy" />
        <h1 className="display text-2xl">Administration</h1>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border" aria-label="Admin">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center gap-1.5 rounded-t-[var(--radius-sm)] px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink"
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
