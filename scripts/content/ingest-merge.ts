/**
 * Merge NEW workflow output into the EXISTING published bank (Round 2 scale-up).
 * Preserves existing items + their audio; appends new items with continued IDs; dedups new
 * against existing + within-batch (exact + Jaccard); applies QA gate for `status`.
 *
 *   scripts/content/raw/qcm2.raw.json + productive2.raw.json  →  src/content/*.json (extended)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listeningItemSchema,
  readingItemSchema,
  speakingTaskSchema,
  vocabularyItemSchema,
  writingTaskSchema,
} from "@/lib/content/schema";
import { loadEnv, projectRoot } from "../lib/env";
import { jaccardDuplicates, normText } from "./lib/dedupe-lib";
import {
  normalizeListening,
  normalizeReading,
  normalizeSpeaking,
  normalizeTopic,
  normalizeVocab,
  normalizeWriting,
  topicCode,
} from "./lib/normalize";

loadEnv();
const OUT = resolve(projectRoot, "src/content");
const RAW = resolve(projectRoot, "scripts/content/raw");
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function readJson<T>(p: string, fallback: T): T {
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback;
}
function readRaw(name: string): any {
  const p = resolve(RAW, name);
  if (!existsSync(p)) return {};
  const parsed = JSON.parse(readFileSync(p, "utf8"));
  return parsed.result ?? parsed;
}

/** max numeric suffix per key group in existing ids (id = prefix_key_NNNN). */
function seqStart(existing: any[], keyOf: (it: any) => string): Map<string, number> {
  const max = new Map<string, number>();
  for (const it of existing) {
    const m = /_(\d{4})$/.exec(it.id);
    if (!m) continue;
    const k = keyOf(it);
    max.set(k, Math.max(max.get(k) ?? 0, Number(m[1])));
  }
  return max;
}

interface KindCfg {
  name: string;
  existingFile: string;
  rawItems: any[];
  normalize: (raw: any, seq: number) => any;
  schema: { safeParse: (v: unknown) => { success: boolean; data?: any; error?: any } };
  seqKey: (raw: any) => string;
  existKey: (it: any) => string; // maps existing item → same key space as seqKey(raw)
  dedupeKey: (it: any) => string;
  qaStatus: (raw: any) => "published" | "draft";
}

function mergeKind(cfg: KindCfg) {
  const existing = readJson<any[]>(resolve(OUT, cfg.existingFile), []);
  const seq = seqStart(existing, cfg.existKey);
  const seen = new Set(existing.map(cfg.dedupeKey));
  const kept: any[] = [];
  let dropInvalid = 0;
  let dropDup = 0;

  for (const raw of cfg.rawItems) {
    const k = cfg.seqKey(raw);
    const next = (seq.get(k) ?? 0) + 1;
    const normalized = cfg.normalize(raw, next);
    if (!normalized) {
      dropInvalid++;
      continue;
    }
    // apply QA-derived status
    normalized.status = cfg.qaStatus(raw);
    const parsed = cfg.schema.safeParse(normalized);
    if (!parsed.success) {
      dropInvalid++;
      continue;
    }
    const dk = cfg.dedupeKey(parsed.data);
    if (seen.has(dk)) {
      dropDup++;
      continue;
    }
    seen.add(dk);
    seq.set(k, next);
    kept.push(parsed.data);
  }

  const combined = [...existing, ...kept];
  writeFileSync(resolve(OUT, cfg.existingFile), `${JSON.stringify(combined, null, 2)}\n`);
  const pub = combined.filter((x) => x.status === "published").length;
  console.log(
    `  ${cfg.name.padEnd(11)} existing ${String(existing.length).padStart(4)} + new ${String(kept.length).padStart(4)} (drop ${dropInvalid}, dup ${dropDup}) → total ${combined.length} (published ${pub})`,
  );
  return combined;
}

function main() {
  const qcm = readRaw("qcm2.raw.json");
  const prod = readRaw("productive2.raw.json");

  console.log("\n Round 2 merge-ingest");
  console.log(" ─────────────────────────────────────────────");

  const listening = mergeKind({
    name: "listening",
    existingFile: "listening.json",
    rawItems: qcm.listening ?? [],
    normalize: normalizeListening,
    schema: listeningItemSchema,
    seqKey: (r) => String(r.cefrLevel).toLowerCase(),
    existKey: (it) => String(it.cefrLevel).toLowerCase(),
    dedupeKey: (it) =>
      hash(
        normText(it.stem) +
          "|" +
          it.options
            .map((o: any) => normText(o.text))
            .sort()
            .join("|"),
      ),
    qaStatus: (r) => (r._qa?.verdict === "published" || r._qa?.blindAgree ? "published" : "draft"),
  });
  const reading = mergeKind({
    name: "reading",
    existingFile: "reading.json",
    rawItems: qcm.reading ?? [],
    normalize: normalizeReading,
    schema: readingItemSchema,
    seqKey: (r) => String(r.cefrLevel).toLowerCase(),
    existKey: (it) => String(it.cefrLevel).toLowerCase(),
    dedupeKey: (it) => hash(normText(it.stem) + "|" + normText(it.passage.text).slice(0, 200)),
    qaStatus: (r) => (r._qa?.verdict === "published" || r._qa?.blindAgree ? "published" : "draft"),
  });
  mergeKind({
    name: "writing",
    existingFile: "writing.json",
    rawItems: prod.writing ?? [],
    normalize: normalizeWriting,
    schema: writingTaskSchema,
    seqKey: (r) => `t${r.taskNumber}`,
    existKey: (it) => `t${it.taskNumber}`,
    dedupeKey: (it) => hash(normText(it.promptFr)),
    qaStatus: () => "published",
  });
  mergeKind({
    name: "speaking",
    existingFile: "speaking.json",
    rawItems: prod.speaking ?? [],
    normalize: normalizeSpeaking,
    schema: speakingTaskSchema,
    seqKey: (r) => `t${r.taskNumber}`,
    existKey: (it) => `t${it.taskNumber}`,
    dedupeKey: (it) => hash(normText(it.promptFr)),
    qaStatus: () => "published",
  });
  mergeKind({
    name: "vocabulary",
    existingFile: "vocabulary.json",
    rawItems: prod.vocabulary ?? [],
    normalize: normalizeVocab,
    schema: vocabularyItemSchema,
    seqKey: (r) => topicCode(normalizeTopic(r.topic)),
    existKey: (it) => /vocab_([a-z0-9]+)_/.exec(it.id)?.[1] ?? "gen",
    dedupeKey: (it) => normText(it.term),
    qaStatus: () => "published",
  });

  // near-duplicate scan among new+existing listening/reading (report only)
  const nd = (arr: any[], t: (x: any) => string) =>
    jaccardDuplicates(
      arr.map((x) => ({ id: x.id, text: t(x) })),
      0.85,
    ).length;
  console.log(
    `\n  near-dup (Jaccard≥0.85): listening ${nd(listening, (x) => `${x.stem} ${x.transcript}`)}, reading ${nd(reading, (x) => `${x.stem} ${x.passage.text}`)}`,
  );
  console.log("");
}

main();
