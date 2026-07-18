/**
 * Ingest raw workflow output → normalized, Zod-validated content JSON.
 *
 *   scripts/content/raw/*.raw.json  →  src/content/{listening,reading,writing,speaking,vocabulary}.json
 *
 * Invalid items are dropped and logged (never silently padded). Exact duplicates are
 * removed here; near-duplicate analysis lives in `content:dedupe`/`content:audit`.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listeningItemSchema,
  readingItemSchema,
  speakingTaskSchema,
  vocabularyItemSchema,
  writingTaskSchema,
} from "@/lib/content/schema";
import { loadEnv, projectRoot } from "../lib/env";
import {
  normalizeListening,
  normalizeReading,
  normalizeSpeaking,
  normalizeVocab,
  normalizeWriting,
} from "./lib/normalize";

loadEnv();

const RAW_DIR = resolve(projectRoot, "scripts/content/raw");
const OUT_DIR = resolve(projectRoot, "src/content");

function readRawBundles() {
  const bundle = { listening: [] as any[], reading: [] as any[], writing: [] as any[], speaking: [] as any[], vocabulary: [] as any[] };
  if (!existsSync(RAW_DIR)) return bundle;
  for (const file of readdirSync(RAW_DIR).filter((f) => f.endsWith(".raw.json"))) {
    const parsed = JSON.parse(readFileSync(resolve(RAW_DIR, file), "utf8"));
    const result = parsed.result ?? parsed; // workflow output wraps in { result }
    for (const key of Object.keys(bundle) as (keyof typeof bundle)[]) {
      if (Array.isArray(result[key])) bundle[key].push(...result[key]);
    }
  }
  return bundle;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function normText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface Report {
  kind: string;
  input: number;
  valid: number;
  invalid: number;
  duplicates: number;
  reasons: string[];
}

function processKind<T>(
  kind: string,
  rawItems: any[],
  normalize: (raw: any, seq: number) => any | null,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: any } },
  seqKey: (raw: any) => string,
  dedupeKey: (item: any) => string,
): { items: T[]; report: Report } {
  const seqCounters = new Map<string, number>();
  const seen = new Set<string>();
  const out: T[] = [];
  const report: Report = { kind, input: rawItems.length, valid: 0, invalid: 0, duplicates: 0, reasons: [] };

  for (const raw of rawItems) {
    const k = seqKey(raw);
    const seq = (seqCounters.get(k) ?? 0) + 1;
    seqCounters.set(k, seq);
    const normalized = normalize(raw, seq);
    if (!normalized) {
      report.invalid++;
      report.reasons.push(`${kind}: normalize returned null (bad options/rationales)`);
      seqCounters.set(k, seq - 1);
      continue;
    }
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) {
      report.invalid++;
      const issue = parsed.error?.issues?.[0];
      report.reasons.push(`${normalized.id}: ${issue?.path?.join(".")} ${issue?.message}`.slice(0, 160));
      seqCounters.set(k, seq - 1);
      continue;
    }
    const dk = dedupeKey(parsed.data);
    if (seen.has(dk)) {
      report.duplicates++;
      seqCounters.set(k, seq - 1);
      continue;
    }
    seen.add(dk);
    out.push(parsed.data as T);
    report.valid++;
  }
  return { items: out, report };
}

function main() {
  const bundle = readRawBundles();
  mkdirSync(OUT_DIR, { recursive: true });

  const listening = processKind(
    "listening",
    bundle.listening,
    normalizeListening,
    listeningItemSchema,
    (r) => String(r.cefrLevel).toLowerCase(),
    (it: any) => hash(normText(it.stem) + "|" + it.options.map((o: any) => normText(o.text)).sort().join("|")),
  );
  const reading = processKind(
    "reading",
    bundle.reading,
    normalizeReading,
    readingItemSchema,
    (r) => String(r.cefrLevel).toLowerCase(),
    (it: any) => hash(normText(it.stem) + "|" + normText(it.passage.text).slice(0, 200)),
  );
  const writing = processKind(
    "writing",
    bundle.writing,
    normalizeWriting,
    writingTaskSchema,
    (r) => `t${r.taskNumber}`,
    (it: any) => hash(normText(it.promptFr)),
  );
  const speaking = processKind(
    "speaking",
    bundle.speaking,
    normalizeSpeaking,
    speakingTaskSchema,
    (r) => `t${r.taskNumber}`,
    (it: any) => hash(normText(it.promptFr)),
  );
  const vocabulary = processKind(
    "vocabulary",
    bundle.vocabulary,
    normalizeVocab,
    vocabularyItemSchema,
    (r) => String(r.topic ?? "gen"),
    (it: any) => normText(it.term),
  );

  const write = (name: string, items: unknown[]) =>
    writeFileSync(resolve(OUT_DIR, `${name}.json`), `${JSON.stringify(items, null, 2)}\n`);

  write("listening", listening.items);
  write("reading", reading.items);
  write("writing", writing.items);
  write("speaking", speaking.items);
  write("vocabulary", vocabulary.items);

  const reports = [listening.report, reading.report, writing.report, speaking.report, vocabulary.report];
  console.log("\n Ingest summary");
  console.log(" ─────────────────────────────────────────────");
  for (const r of reports) {
    console.log(
      `  ${r.kind.padEnd(11)} in ${String(r.input).padStart(4)} → valid ${String(r.valid).padStart(4)}  (drop ${r.invalid}, dup ${r.duplicates})`,
    );
  }
  const rejectLog = reports.flatMap((r) => r.reasons.slice(0, 25));
  if (rejectLog.length) {
    writeFileSync(
      resolve(OUT_DIR, "_rejects.log"),
      `${rejectLog.join("\n")}\n`,
    );
    console.log(`\n  ${rejectLog.length} rejection reasons written to src/content/_rejects.log`);
  }
  console.log("");
}

main();
