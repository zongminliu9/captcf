import { Info } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: "bg-navy-50 text-navy border-navy-100",
  success: "bg-success-50 text-success border-success/20",
  warning: "bg-warning-50 text-warning border-warning/20",
  danger: "bg-danger-50 text-danger border-danger/20",
  neutral: "bg-surface-2 text-muted border-border",
} as const;

export function Alert({
  tone = "info",
  icon,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof tones;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon ?? <Info className="h-4 w-4" />}
      </span>
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-sm)] bg-surface-3", className)}
      {...props}
    />
  );
}
