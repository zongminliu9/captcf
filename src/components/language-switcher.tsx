"use client";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";
import { useState } from "react";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
      >
        <Globe className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="card card-raised absolute right-0 z-50 mt-1 w-40 overflow-hidden p-1"
        >
          {LOCALES.map((l) => (
            <a
              key={l}
              role="menuitem"
              href={`/api/locale?l=${l}`}
              className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm text-ink hover:bg-surface-2"
            >
              {LOCALE_LABELS[l]}
              {l === locale && <Check className="h-4 w-4 text-navy" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
