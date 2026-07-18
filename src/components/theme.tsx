"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

/** Inline script that applies the saved theme before first paint (no flash). */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('captcf-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted static string
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("captcf-theme") as Theme) || "system";
    setTheme(saved);
  }, []);

  const cycle = () => {
    const order: Theme[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length]!;
    setTheme(next);
    localStorage.setItem("captcf-theme", next);
    apply(next);
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const labels: Record<Theme, string> = { light: "Thème clair", dark: "Thème sombre", system: "Thème système" };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={labels[theme]}
      title={labels[theme]}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
