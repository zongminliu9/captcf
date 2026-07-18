"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setAudioQuality } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";

const TIERS = ["prototype_tts", "reviewed_tts", "premium_ready", "rejected"] as const;

export function AudioQaControls({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIERS.map((t) => (
        <Button
          key={t}
          size="sm"
          variant={t === current ? "primary" : "outline"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setAudioQuality(id, t);
              router.refresh();
            })
          }
        >
          {t.replace("_tts", "").replace("_", " ")}
        </Button>
      ))}
    </div>
  );
}
