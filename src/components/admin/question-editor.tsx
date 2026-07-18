"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateQuestionFields, updateQuestionStatus } from "@/app/(app)/admin/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

const STATUSES = ["draft", "in_review", "published", "retired"] as const;

export function QuestionEditor({
  id,
  status,
  stem,
  explanation,
}: {
  id: string;
  status: string;
  stem: string;
  explanation: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [stemVal, setStem] = useState(stem);
  const [explVal, setExpl] = useState(explanation);
  const dirty = stemVal !== stem || explVal !== explanation;

  const setStatus = (s: (typeof STATUSES)[number]) =>
    start(async () => {
      await updateQuestionStatus(id, s);
      toast(`Statut : ${s}`, "success");
      router.refresh();
    });

  const save = () =>
    start(async () => {
      await updateQuestionFields(id, { stem: stemVal, explanation: explVal });
      toast("Enregistré (nouvelle version).", "success");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-sm font-medium">Statut</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              disabled={pending}
              className="rounded-full border border-border-strong px-3 py-1 text-sm hover:bg-surface-2 disabled:opacity-50 aria-[current=true]:border-navy aria-[current=true]:bg-navy-50"
              aria-current={status === s}
            >
              {s === status ? <Badge variant="navy" size="sm">{s}</Badge> : s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium">Énoncé</div>
        <Textarea value={stemVal} onChange={(e) => setStem(e.target.value)} rows={2} />
      </div>
      <div>
        <div className="mb-1.5 text-sm font-medium">Explication</div>
        <Textarea value={explVal} onChange={(e) => setExpl(e.target.value)} rows={4} />
      </div>
      <Button variant="primary" onClick={save} disabled={pending || !dirty}>
        {pending ? "…" : "Enregistrer les modifications"}
      </Button>
    </div>
  );
}
