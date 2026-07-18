import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-muted",
        navy: "bg-navy-50 text-navy",
        success: "bg-success-50 text-success",
        warning: "bg-warning-50 text-warning",
        danger: "bg-danger-50 text-danger",
        gold: "bg-gold-50 text-gold",
        accent: "bg-accent-50 text-accent",
        outline: "border border-border-strong text-muted",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

/** Maps a CEFR level to a stable badge colour. */
export function cefrVariant(cefr: string): BadgeProps["variant"] {
  switch (cefr) {
    case "A1":
    case "A2":
      return "success";
    case "B1":
    case "B2":
      return "navy";
    default:
      return "gold";
  }
}
