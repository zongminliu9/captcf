"use client";
import { type CustomConfig, startCustomPractice } from "@/app/(app)/practice/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { useState, useTransition } from "react";

const CEFRS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function CustomPracticeForm() {
  const [skills, setSkills] = useState<Set<"listening" | "reading">>(
    new Set(["listening", "reading"]),
  );
  const [count, setCount] = useState(10);
  const [levels, setLevels] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<CustomConfig["source"]>("mixed");
  const [timed, setTimed] = useState(false);
  const [pending, start] = useTransition();

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  };

  const submit = () => {
    start(async () => {
      await startCustomPractice({
        skills: [...skills],
        count,
        cefrLevels: levels.size ? [...levels] : undefined,
        source,
        timed,
        instantFeedback: !timed,
      });
    });
  };

  return (
    <Card className="p-6" raised>
      <Group label="Compétences">
        {(["listening", "reading"] as const).map((s) => (
          <Chip key={s} active={skills.has(s)} onClick={() => toggle(skills, s, setSkills)}>
            {s === "listening" ? "Compréhension orale" : "Compréhension écrite"}
          </Chip>
        ))}
      </Group>

      <Group label={`Nombre de questions : ${count}`}>
        <input
          type="range"
          min={5}
          max={40}
          step={5}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[var(--navy)]"
          aria-label="Nombre de questions"
        />
      </Group>

      <Group label="Niveaux (facultatif)">
        {CEFRS.map((c) => (
          <Chip key={c} active={levels.has(c)} onClick={() => toggle(levels, c, setLevels)}>
            {c}
          </Chip>
        ))}
      </Group>

      <Group label="Source">
        {(
          [
            ["mixed", "Toutes"],
            ["new", "Nouvelles"],
            ["mistakes", "Mes erreurs"],
            ["bookmarks", "Mes favoris"],
            ["due", "À réviser"],
          ] as const
        ).map(([value, label]) => (
          <Chip key={value} active={source === value} onClick={() => setSource(value)}>
            {label}
          </Chip>
        ))}
      </Group>

      <Group label="Mode">
        <Chip active={!timed} onClick={() => setTimed(false)}>
          Apprentissage (feedback immédiat)
        </Chip>
        <Chip active={timed} onClick={() => setTimed(true)}>
          Chronométré
        </Chip>
      </Group>

      <Button
        variant="primary"
        className="mt-4 w-full"
        onClick={submit}
        disabled={pending || skills.size === 0}
      >
        <Play className="h-4 w-4" /> {pending ? "Préparation…" : "Lancer l'entraînement"}
      </Button>
    </Card>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-sm font-medium text-ink">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
