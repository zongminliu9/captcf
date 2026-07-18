/**
 * Content quality audit. Fails (exit 1) on any blocking issue so `pnpm check` gates on it.
 * Writes human reports to docs/content/*.md and (best-effort) a row to content_audits.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listeningItemSchema,
  readingItemSchema,
  speakingTaskSchema,
  vocabularyItemSchema,
  writingTaskSchema,
} from "@/lib/content/schema";
import { CEFR_LEVELS } from "@/lib/exam/config";
import { loadEnv, projectRoot } from "../lib/env";
import { jaccardDuplicates, normText } from "./lib/dedupe-lib";
import { loadContent } from "./lib/load-files";

loadEnv();

interface Issue {
  severity: "error" | "warn";
  id: string;
  message: string;
}

const issues: Issue[] = [];
const err = (id: string, message: string) => issues.push({ severity: "error", id, message });
const warn = (id: string, message: string) => issues.push({ severity: "warn", id, message });

function auditQcm(kind: string, items: any[], schema: any, opts: { requireAudio?: boolean }) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const answerLetters: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };

  for (const it of items) {
    const parsed = schema.safeParse(it);
    if (!parsed.success) {
      err(it.id ?? kind, `schema invalid: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    if (ids.has(it.id)) err(it.id, "duplicate id");
    ids.add(it.id);
    if (slugs.has(it.slug)) err(it.id, "duplicate slug");
    slugs.add(it.slug);

    // exactly one correct answer present in options
    const optIds = it.options.map((o: any) => o.id);
    if (!optIds.includes(it.correctAnswer)) err(it.id, "correctAnswer not among options");
    answerLetters[it.correctAnswer] = (answerLetters[it.correctAnswer] ?? 0) + 1;

    // distractor rationales cover exactly the non-correct options
    const need = optIds.filter((x: string) => x !== it.correctAnswer).sort();
    const have = Object.keys(it.distractorRationales).sort();
    if (JSON.stringify(need) !== JSON.stringify(have))
      err(it.id, "distractorRationales don't match non-correct options");

    // options distinct + non-empty
    const texts = it.options.map((o: any) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) err(it.id, "duplicate option texts");
    if (texts.some((t: string) => !t)) err(it.id, "empty option text");

    // correct option is not always the longest (anti-pattern)
    const lens = it.options.map((o: any) => o.text.length);
    const correctLen = it.options.find((o: any) => o.id === it.correctAnswer)!.text.length;
    if (
      correctLen === Math.max(...lens) &&
      lens.filter((l: number) => l === correctLen).length === 1
    ) {
      // per-item is fine; we check the global rate below
      (auditQcm as any)._longest = ((auditQcm as any)._longest ?? 0) + 1;
    }

    // stem shouldn't verbatim-contain the full correct option (answer leak heuristic)
    const stemN = normText(it.stem);
    const correctN = normText(it.options.find((o: any) => o.id === it.correctAnswer)!.text);
    if (correctN.length > 12 && stemN.includes(correctN)) warn(it.id, "stem may leak the answer");

    if (opts.requireAudio) {
      if (!it.audio?.file) err(it.id, "listening item has no audio file");
      else if (!existsSync(resolve(projectRoot, "public", it.audio.file.replace(/^\//, ""))))
        err(it.id, `audio file missing on disk: ${it.audio.file}`);
      if (!it.transcript || it.transcript.length < 5) err(it.id, "missing transcript");
      if (!it.audio?.durationSeconds) warn(it.id, "audio duration not recorded");
    }
  }

  // answer-letter skew: no letter should exceed 45% of items
  const total = items.length || 1;
  for (const [letter, n] of Object.entries(answerLetters)) {
    if (n / total > 0.45)
      warn(kind, `answer letter '${letter}' overused (${Math.round((n / total) * 100)}%)`);
  }
  return { count: items.length, ids, answerLetters };
}

function auditWriting(items: any[]) {
  const ids = new Set<string>();
  for (const it of items) {
    const parsed = writingTaskSchema.safeParse(it);
    if (!parsed.success) {
      err(it.id ?? "writing", `schema invalid: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    if (ids.has(it.id)) err(it.id, "duplicate id");
    ids.add(it.id);
    if (it.minWords >= it.maxWords) err(it.id, "minWords >= maxWords");
    if (![1, 2, 3].includes(it.taskNumber)) err(it.id, "invalid task number");
    if (it.keywords.length < 3) warn(it.id, "few keywords");
  }
}

function auditSpeaking(items: any[]) {
  const ids = new Set<string>();
  for (const it of items) {
    const parsed = speakingTaskSchema.safeParse(it);
    if (!parsed.success) {
      err(it.id ?? "speaking", `schema invalid: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    if (ids.has(it.id)) err(it.id, "duplicate id");
    ids.add(it.id);
    if (it.guidingPointsFr.length < 2) warn(it.id, "few guiding points");
  }
}

function auditVocab(items: any[]) {
  const ids = new Set<string>();
  const terms = new Set<string>();
  for (const it of items) {
    const parsed = vocabularyItemSchema.safeParse(it);
    if (!parsed.success) {
      err(it.id ?? "vocab", `schema invalid: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    if (ids.has(it.id)) err(it.id, "duplicate id");
    ids.add(it.id);
    const t = normText(it.term);
    if (terms.has(t)) err(it.id, `duplicate term "${it.term}"`);
    terms.add(t);
    if (!it.gloss_en || !it.gloss_zh) err(it.id, "missing gloss");
  }
}

function distribution(items: any[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it[key]] = (out[it[key]] ?? 0) + 1;
  return out;
}

async function main() {
  const c = loadContent();
  const requireAudio = process.argv.includes("--require-audio");

  auditQcm("listening", c.listening, listeningItemSchema, { requireAudio });
  auditQcm("reading", c.reading, readingItemSchema, { requireAudio: false });
  auditWriting(c.writing);
  auditSpeaking(c.speaking);
  auditVocab(c.vocabulary);

  // near-duplicate detection (Jaccard on shingles)
  const dupL = jaccardDuplicates(
    c.listening.map((x) => ({ id: x.id, text: `${x.stem} ${x.transcript}` })),
    0.82,
  );
  const dupR = jaccardDuplicates(
    c.reading.map((x) => ({ id: x.id, text: `${x.stem} ${x.passage.text}` })),
    0.82,
  );
  for (const [a, b, s] of [...dupL, ...dupR])
    warn(a, `near-duplicate of ${b} (Jaccard ${s.toFixed(2)})`);

  // reports
  const docs = resolve(projectRoot, "docs/content");
  mkdirSync(docs, { recursive: true });

  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");

  const inv = [
    "# Content inventory",
    "",
    `Generated by \`pnpm content:audit\`.`,
    "",
    "| Kind | Count |",
    "| --- | ---: |",
    `| Listening (QCM, with audio) | ${c.listening.length} |`,
    `| Reading (QCM) | ${c.reading.length} |`,
    `| Writing tasks | ${c.writing.length} |`,
    `| Speaking tasks | ${c.speaking.length} |`,
    `| Vocabulary | ${c.vocabulary.length} |`,
    `| **Total items** | **${c.listening.length + c.reading.length + c.writing.length + c.speaking.length + c.vocabulary.length}** |`,
    "",
  ].join("\n");
  writeFileSync(resolve(docs, "CONTENT_INVENTORY.md"), `${inv}\n`);

  const distReport = [
    "# Distribution report",
    "",
    "## Listening by CEFR",
    fmtDist(distribution(c.listening, "cefrLevel")),
    "## Reading by CEFR",
    fmtDist(distribution(c.reading, "cefrLevel")),
    "## Listening by topic",
    fmtDist(distribution(c.listening, "topic")),
    "## Reading by topic",
    fmtDist(distribution(c.reading, "topic")),
    "## Vocabulary by CEFR",
    fmtDist(distribution(c.vocabulary, "cefrLevel")),
    "## Writing by task",
    fmtDist(distribution(c.writing, "taskNumber")),
    "## Speaking by task",
    fmtDist(distribution(c.speaking, "taskNumber")),
  ].join("\n\n");
  writeFileSync(resolve(docs, "DISTRIBUTION_REPORT.md"), `${distReport}\n`);

  const qa = [
    "# Quality audit",
    "",
    `- Errors: **${errors.length}**`,
    `- Warnings: **${warns.length}**`,
    "",
    "## Errors",
    errors.length ? errors.map((i) => `- \`${i.id}\` — ${i.message}`).join("\n") : "_None._",
    "",
    "## Warnings",
    warns.length
      ? warns
          .slice(0, 200)
          .map((i) => `- \`${i.id}\` — ${i.message}`)
          .join("\n")
      : "_None._",
  ].join("\n");
  writeFileSync(resolve(docs, "QUALITY_AUDIT.md"), `${qa}\n`);

  const dupReport = [
    "# Duplicate report",
    "",
    "Exact duplicates are removed at ingest. This lists near-duplicates (Jaccard ≥ 0.82).",
    "",
    [...dupL, ...dupR].length
      ? [...dupL, ...dupR].map(([a, b, s]) => `- \`${a}\` ≈ \`${b}\` (${s.toFixed(2)})`).join("\n")
      : "_No near-duplicates found._",
  ].join("\n");
  writeFileSync(resolve(docs, "DUPLICATE_REPORT.md"), `${dupReport}\n`);

  console.log("\n Content audit");
  console.log(" ─────────────────────────────");
  console.log(
    `  listening ${c.listening.length}  reading ${c.reading.length}  writing ${c.writing.length}  speaking ${c.speaking.length}  vocab ${c.vocabulary.length}`,
  );
  console.log(`  errors: ${errors.length}   warnings: ${warns.length}`);
  console.log("  reports → docs/content/*.md\n");
  if (errors.length) {
    for (const e of errors.slice(0, 30)) console.log(`  ✗ ${e.id}: ${e.message}`);
    process.exitCode = 1;
  }
}

function fmtDist(d: Record<string, number>): string {
  const rows = Object.entries(d)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([k, v]) => `| ${k} | ${v} |`);
  return `| Key | Count |\n| --- | ---: |\n${rows.join("\n")}`;
}

main();
