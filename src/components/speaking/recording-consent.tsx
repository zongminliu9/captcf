import { Mic } from "lucide-react";

/**
 * Short data/retention notice shown before/near any audio recording control, so a learner
 * knows what happens to their voice before granting the mic. Matches the privacy policy.
 */
export function RecordingConsent() {
  return (
    <p className="flex items-start gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
      <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Vos enregistrements servent uniquement à votre auto-évaluation (résultats non officiels),
        sont stockés de façon privée et sont supprimés lorsque vous supprimez votre compte.
      </span>
    </p>
  );
}
