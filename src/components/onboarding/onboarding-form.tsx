"use client";
import { saveOnboarding } from "@/app/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

const CEFRS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = [
  ["listening", "Écoute"],
  ["reading", "Lecture"],
  ["writing", "Écrit"],
  ["speaking", "Oral"],
] as const;

export function OnboardingForm() {
  const [level, setLevel] = useState("B1");
  const [target, setTarget] = useState(7);
  const [examDate, setExamDate] = useState("");
  const [weeklyDays, setWeeklyDays] = useState(4);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const [prior, setPrior] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    start(async () => {
      await saveOnboarding({
        currentLevel: level,
        targetNclc: target,
        examDate: examDate || null,
        weeklyDays,
        dailyMinutes,
        focusSkills: [...focus],
        priorAttempt: prior,
      });
    });
  };

  return (
    <Card className="p-6 sm:p-8" raised>
      <div className="mb-5">
        <Label>Votre niveau actuel estimé</Label>
        <div className="flex flex-wrap gap-2">
          {CEFRS.map((c) => (
            <Chip key={c} active={level === c} onClick={() => setLevel(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <Label>Objectif NCLC : {target}</Label>
        <input
          type="range"
          min={4}
          max={10}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-full accent-[var(--navy)]"
          aria-label="Objectif NCLC"
        />
        <p className="mt-1 text-xs text-muted">NCLC 7 est le seuil courant pour Entrée express.</p>
      </div>

      <div className="mb-5">
        <Label htmlFor="examDate">Date d'examen (facultatif)</Label>
        <Input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <Label>Jours / semaine : {weeklyDays}</Label>
          <input
            type="range"
            min={1}
            max={7}
            value={weeklyDays}
            onChange={(e) => setWeeklyDays(Number(e.target.value))}
            className="w-full accent-[var(--navy)]"
            aria-label="Jours par semaine"
          />
        </div>
        <div>
          <Label>Minutes / jour : {dailyMinutes}</Label>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="w-full accent-[var(--navy)]"
            aria-label="Minutes par jour"
          />
        </div>
      </div>

      <div className="mb-5">
        <Label>Compétences prioritaires</Label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(([id, label]) => (
            <Chip
              key={id}
              active={focus.has(id)}
              onClick={() =>
                setFocus((s) => {
                  const next = new Set(s);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <label className="mb-6 flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={prior}
          onChange={(e) => setPrior(e.target.checked)}
          className="h-4 w-4 accent-[var(--navy)]"
        />
        J'ai déjà passé le TCF Canada.
      </label>

      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          Passer pour l'instant
        </Link>
        <Button variant="primary" onClick={submit} disabled={pending}>
          {pending ? "…" : "Créer mon plan"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function Chip({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-navy bg-navy-50 text-navy"
          : "border-border-strong text-muted hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
