"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveReport } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (status: "reviewing" | "resolved" | "dismissed") =>
    start(async () => {
      await resolveReport(id, status);
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("dismissed")}>
        Rejeter
      </Button>
      <Button size="sm" variant="primary" disabled={pending} onClick={() => act("resolved")}>
        Résoudre
      </Button>
    </div>
  );
}
