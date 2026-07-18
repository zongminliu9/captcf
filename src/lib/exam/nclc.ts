/**
 * Official IRCC TCF-Canada score → NCLC/CLB conversion + CEFR bands.
 *
 * Verified against IRCC / France Éducation international published tables
 * (see docs/research/OFFICIAL_EXAM_SPEC.md for sources + retrieval dates).
 * Listening/Reading use the 0–699 scale; Writing/Speaking use the 0–20 scale.
 */
import type { CefrLevel, SkillId } from "./config";

export const NCLC_TABLE_VERSION = "IRCC-2026-01" as const;

export interface NclcRow {
  nclc: number; // 4..10 (10 == "10 and above")
  listening: [number, number]; // 0–699 inclusive
  reading: [number, number];
  writing: [number, number]; // 0–20 inclusive
  speaking: [number, number];
  cefr: CefrLevel;
}

/** Ordered high → low so the first match wins. */
export const NCLC_TABLE: readonly NclcRow[] = [
  { nclc: 10, listening: [549, 699], reading: [549, 699], writing: [16, 20], speaking: [16, 20], cefr: "C2" },
  { nclc: 9, listening: [523, 548], reading: [524, 548], writing: [14, 15], speaking: [14, 15], cefr: "C1" },
  { nclc: 8, listening: [503, 522], reading: [499, 523], writing: [12, 13], speaking: [12, 13], cefr: "B2" },
  { nclc: 7, listening: [458, 502], reading: [453, 498], writing: [10, 11], speaking: [10, 11], cefr: "B2" },
  { nclc: 6, listening: [398, 457], reading: [406, 452], writing: [7, 9], speaking: [7, 9], cefr: "B1" },
  { nclc: 5, listening: [369, 397], reading: [375, 405], writing: [6, 6], speaking: [6, 6], cefr: "B1" },
  { nclc: 4, listening: [331, 368], reading: [342, 374], writing: [4, 5], speaking: [4, 5], cefr: "A2" },
] as const;

/** CEFR bands for the 0–699 scaled scores (Listening / Reading). */
export const CEFR_699_BANDS: readonly { cefr: CefrLevel; range: [number, number] }[] = [
  { cefr: "C2", range: [600, 699] },
  { cefr: "C1", range: [500, 599] },
  { cefr: "B2", range: [400, 499] },
  { cefr: "B1", range: [300, 399] },
  { cefr: "A2", range: [200, 299] },
  { cefr: "A1", range: [100, 199] },
];

/** CEFR bands for the 0–20 scale (Writing / Speaking). */
export const CEFR_20_BANDS: readonly { cefr: CefrLevel; range: [number, number] }[] = [
  { cefr: "C2", range: [18, 20] },
  { cefr: "C1", range: [14, 17] },
  { cefr: "B2", range: [10, 13] },
  { cefr: "B1", range: [6, 9] },
  { cefr: "A2", range: [2, 5] },
  { cefr: "A1", range: [1, 1] },
];

function scaleForSkill(skill: SkillId): "scale699" | "scale20" {
  return skill === "listening" || skill === "reading" ? "scale699" : "scale20";
}

/** Map a raw section score to its NCLC level (0 if below NCLC 4). */
export function scoreToNclc(skill: SkillId, score: number): number {
  for (const row of NCLC_TABLE) {
    const [lo, hi] = row[skill];
    if (score >= lo && score <= hi) return row.nclc;
  }
  // above the top of the table clamps to 10; below NCLC 4 is 0 ("not yet 4")
  const top = NCLC_TABLE[0]![skill];
  if (score > top[1]) return 10;
  return 0;
}

/** Map a raw section score to its CEFR level. */
export function scoreToCefr(skill: SkillId, score: number): CefrLevel | "below-A1" {
  const bands = scaleForSkill(skill) === "scale699" ? CEFR_699_BANDS : CEFR_20_BANDS;
  for (const b of bands) {
    if (score >= b.range[0] && score <= b.range[1]) return b.cefr;
  }
  return "below-A1";
}

/**
 * Overall NCLC for immigration is the *minimum* across the four skills
 * (IRCC requires every skill to reach the target level).
 */
export function overallNclc(perSkill: Partial<Record<SkillId, number>>): number {
  const values = Object.values(perSkill).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/** Minimum raw score needed to reach a given NCLC for a skill (for goal gaps). */
export function minScoreForNclc(skill: SkillId, nclc: number): number | null {
  const row = NCLC_TABLE.find((r) => r.nclc === nclc);
  if (!row) return null;
  return row[skill][0];
}
