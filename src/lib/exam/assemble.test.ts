import { describe, expect, it } from "vitest";
import { type QcmRef, type TaskRef, assembleMocks } from "./assemble";
import { CEFR_LEVELS, type CefrLevel } from "./config";

function makeQcm(prefix: string, perLevel: number): QcmRef[] {
  const out: QcmRef[] = [];
  for (const lvl of CEFR_LEVELS) {
    for (let i = 0; i < perLevel; i++)
      out.push({ id: `${prefix}_${lvl}_${i}`, cefrLevel: lvl as CefrLevel });
  }
  return out;
}
function makeTasks(prefix: string, perTask: number): TaskRef[] {
  const out: TaskRef[] = [];
  for (const t of [1, 2, 3])
    for (let i = 0; i < perTask; i++) out.push({ id: `${prefix}_t${t}_${i}`, taskNumber: t });
  return out;
}

describe("assembleMocks", () => {
  const bank = {
    listening: makeQcm("l", 20),
    reading: makeQcm("r", 22),
    writing: makeTasks("w", 15),
    speaking: makeTasks("s", 15),
  };
  const result = assembleMocks(bank, 4);

  it("produces 4 complete forms of the official length", () => {
    expect(result.forms).toHaveLength(4);
    for (const form of result.forms) {
      expect(form.listening).toHaveLength(39);
      expect(form.reading).toHaveLength(39);
      expect(form.writing).toHaveLength(3);
      expect(form.speaking).toHaveLength(3);
    }
  });

  it("has no repeated item within a single form", () => {
    for (const form of result.forms) {
      expect(new Set(form.listening).size).toBe(39);
      expect(new Set(form.reading).size).toBe(39);
    }
  });

  it("orders each QCM section by ascending difficulty", () => {
    const idxOf = (id: string) => CEFR_LEVELS.indexOf(id.split("_")[1] as CefrLevel);
    for (const form of result.forms) {
      const levels = form.listening.map(idxOf);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
    }
  });

  it("gives each form distinct writing/speaking tasks (enough bank)", () => {
    const allWriting = result.forms.flatMap((f) => f.writing);
    expect(new Set(allWriting).size).toBe(allWriting.length);
  });

  it("bounds reuse and reports overlap", () => {
    expect(result.overlap.listeningMaxUses).toBeLessThanOrEqual(2);
    expect(result.overlap.readingMaxUses).toBeLessThanOrEqual(2);
  });

  it("is deterministic", () => {
    const again = assembleMocks(bank, 4);
    expect(again.forms).toEqual(result.forms);
  });
});
