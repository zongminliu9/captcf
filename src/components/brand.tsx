import { cn } from "@/lib/utils";

/** Original CapTCF mark: a navy rounded tile with a stylised "C" opening and an accent notch. */
export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CapTCF"
    >
      <rect width="40" height="40" rx="10" fill="var(--navy)" />
      <path
        d="M27.5 14.2a9 9 0 1 0 0 11.6"
        stroke="var(--on-navy)"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="27.8" cy="20" r="2.4" fill="var(--gold)" />
    </svg>
  );
}

export function Wordmark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span className="text-[1.15rem] font-semibold tracking-tight text-ink">
        Cap<span className="text-navy">TCF</span>
      </span>
    </span>
  );
}
