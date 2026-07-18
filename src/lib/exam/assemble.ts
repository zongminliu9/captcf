/**
 * Deterministic mock-exam assembly from the audited item bank.
 *
 * Builds N complete forms, each a full official-length section set:
 *   CO = 39 listening · CE = 39 reading · EE = 3 writing tasks · EO = 3 speaking tasks
 * QCM sections follow a progressive CEFR distribution and spread reuse across forms
 * (greedy least-used). Productive sections use distinct tasks per form. Pure + seeded
 * (no RNG) so the same bank always yields the same forms.
 */
import { type CefrLevel, CEFR_ORDER, EXAM_SPEC } from "./config";

export interface QcmRef {
  id: string;
  cefrLevel: CefrLevel;
}
export interface TaskRef {
  id: string;
  taskNumber: number;
}

export interface MockForm {
  formNumber: number;
  listening: string[];
  reading: string[];
  writing: string[];
  speaking: string[];
}

export interface AssemblyResult {
  forms: MockForm[];
  overlap: {
    listeningMaxUses: number;
    readingMaxUses: number;
    listeningDistinct: number;
    readingDistinct: number;
  };
  warnings: string[];
}

/** Progressive difficulty target for a 39-item QCM section. */
const SECTION_TARGET: [CefrLevel, number][] = [
  ["A1", 4],
  ["A2", 7],
  ["B1", 10],
  ["B2", 9],
  ["C1", 6],
  ["C2", 3],
];

const byCefr = (a: string, b: string) =>
  CEFR_ORDER[a as CefrLevel] - CEFR_ORDER[b as CefrLevel];

function pickQcmSection(
  bank: QcmRef[],
  formCount: number,
  usage: Map<string, number>,
  warnings: string[],
  label: string,
): string[][] {
  const byLevel = new Map<CefrLevel, QcmRef[]>();
  for (const it of bank) {
    const arr = byLevel.get(it.cefrLevel) ?? [];
    arr.push(it);
    byLevel.set(it.cefrLevel, arr);
  }
  // stable order within each level (by id) for determinism
  for (const arr of byLevel.values()) arr.sort((a, b) => (a.id < b.id ? -1 : 1));

  const levelsAsc = [...byLevel.keys()].sort(byCefr);
  const nearestPool = (level: CefrLevel): QcmRef[] => {
    if (byLevel.get(level)?.length) return byLevel.get(level)!;
    // fall back to the nearest non-empty level
    let best: QcmRef[] | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const l of levelsAsc) {
      const d = Math.abs(CEFR_ORDER[l] - CEFR_ORDER[level]);
      if (byLevel.get(l)!.length && d < bestDist) {
        bestDist = d;
        best = byLevel.get(l)!;
      }
    }
    if (best) warnings.push(`${label}: no ${level} items, substituted nearest level`);
    return best ?? bank;
  };

  const forms: string[][] = [];
  for (let f = 0; f < formCount; f++) {
    const chosen: { id: string; cefrLevel: CefrLevel }[] = [];
    const inThisForm = new Set<string>();
    for (const [level, count] of SECTION_TARGET) {
      const pool = nearestPool(level);
      for (let k = 0; k < count; k++) {
        // least-used item in the pool not already in this form
        let best: QcmRef | null = null;
        let bestUse = Number.POSITIVE_INFINITY;
        for (const cand of pool) {
          if (inThisForm.has(cand.id)) continue;
          const u = usage.get(cand.id) ?? 0;
          if (u < bestUse) {
            bestUse = u;
            best = cand;
          }
        }
        if (!best) {
          // pool exhausted for this form → allow any least-used from whole bank
          for (const cand of bank) {
            if (inThisForm.has(cand.id)) continue;
            const u = usage.get(cand.id) ?? 0;
            if (u < bestUse) {
              bestUse = u;
              best = cand;
            }
          }
        }
        if (!best) break;
        inThisForm.add(best.id);
        usage.set(best.id, (usage.get(best.id) ?? 0) + 1);
        chosen.push({ id: best.id, cefrLevel: best.cefrLevel });
      }
    }
    chosen.sort((a, b) => byCefr(a.cefrLevel, b.cefrLevel));
    forms.push(chosen.map((c) => c.id));
  }
  return forms;
}

function pickTaskSection(bank: TaskRef[], formCount: number): string[][] {
  const byTask = new Map<number, TaskRef[]>();
  for (const it of bank) {
    const arr = byTask.get(it.taskNumber) ?? [];
    arr.push(it);
    byTask.set(it.taskNumber, arr);
  }
  for (const arr of byTask.values()) arr.sort((a, b) => (a.id < b.id ? -1 : 1));

  const forms: string[][] = [];
  for (let f = 0; f < formCount; f++) {
    const section: string[] = [];
    for (const task of [1, 2, 3]) {
      const pool = byTask.get(task) ?? [];
      if (pool.length) section.push(pool[f % pool.length]!.id); // distinct per form while pool allows
    }
    forms.push(section);
  }
  return forms;
}

export function assembleMocks(
  bank: { listening: QcmRef[]; reading: QcmRef[]; writing: TaskRef[]; speaking: TaskRef[] },
  formCount = 4,
): AssemblyResult {
  const warnings: string[] = [];
  const lUsage = new Map<string, number>();
  const rUsage = new Map<string, number>();

  const listening = pickQcmSection(bank.listening, formCount, lUsage, warnings, "listening");
  const reading = pickQcmSection(bank.reading, formCount, rUsage, warnings, "reading");
  const writing = pickTaskSection(bank.writing, formCount);
  const speaking = pickTaskSection(bank.speaking, formCount);

  const forms: MockForm[] = [];
  for (let f = 0; f < formCount; f++) {
    forms.push({
      formNumber: f + 1,
      listening: listening[f]!,
      reading: reading[f]!,
      writing: writing[f]!,
      speaking: speaking[f]!,
    });
    // sanity: each QCM section must be full length
    if (listening[f]!.length !== EXAM_SPEC.listening.itemCount)
      warnings.push(`form ${f + 1} listening has ${listening[f]!.length}/${EXAM_SPEC.listening.itemCount}`);
    if (reading[f]!.length !== EXAM_SPEC.reading.itemCount)
      warnings.push(`form ${f + 1} reading has ${reading[f]!.length}/${EXAM_SPEC.reading.itemCount}`);
  }

  return {
    forms,
    overlap: {
      listeningMaxUses: Math.max(0, ...lUsage.values()),
      readingMaxUses: Math.max(0, ...rUsage.values()),
      listeningDistinct: lUsage.size,
      readingDistinct: rUsage.size,
    },
    warnings,
  };
}
