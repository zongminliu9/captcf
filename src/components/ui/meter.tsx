import { cn } from "@/lib/utils";
import type * as React from "react";

interface MeterProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..1
  label?: string;
  tone?: "navy" | "success" | "gold" | "accent";
  showValue?: boolean;
}

const toneBg: Record<NonNullable<MeterProps["tone"]>, string> = {
  navy: "bg-navy",
  success: "bg-success",
  gold: "bg-gold",
  accent: "bg-accent",
};

/** Accessible linear meter (progressbar role) used for mastery/progress. */
export function Meter({ value, label, tone = "navy", showValue, className, ...props }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  return (
    <div className={cn("w-full", className)} {...props}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-muted">{label}</span>}
          {showValue && <span className="font-medium tabular-nums text-ink">{percent}%</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "progress"}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", toneBg[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
