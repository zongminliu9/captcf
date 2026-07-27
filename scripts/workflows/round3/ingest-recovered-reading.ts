import { createHash } from "node:crypto";
/**
 * Ingest the recovered accepted reading items (content/round3-staging/accepted/*.json) into the
 * bank (src/content/reading.json). Reuses the SAME normalize + schema + dedupe as the Round-2
 * merge-ingest: continued ids per CEFR, schema-validated, deduped by stem+passage against the
 * existing bank. Deterministic — no model calls. Idempotent (re-running adds nothing new).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readingItemSchema } from "@/lib/content/schema";
import { loadEnv, projectRoot } from "../../lib/env";
import { normalizeReading, normalizeText } from "./_normshim";

loadEnv();
const OUT = resolve(projectRoot, "src/content/reading.json");
const ACCEPTED = resolve(projectRoot, "content/round3-staging/accepted");
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const existing: any[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const seq = new Map<string, number>();
for (const it of existing) {
  const m = /_(\d{4})$/.exec(it.id);
  if (!m) continue;
  const k = String(it.cefrLevel).toLowerCase();
  seq.set(k, Math.max(seq.get(k) ?? 0, Number(m[1])));
}
const dk = (it: any) =>
  hash(normalizeText(it.stem) + "|" + normalizeText(it.passage.text).slice(0, 200));
const seen = new Set(existing.map(dk));

let added = 0;
let dupe = 0;
let invalid = 0;
const files = existsSync(ACCEPTED)
  ? readdirSync(ACCEPTED)
      .filter((f) => f.endsWith(".json"))
      .sort()
  : [];
for (const f of files) {
  const raws: any[] = JSON.parse(readFileSync(resolve(ACCEPTED, f), "utf8"));
  for (const raw of raws) {
    const k = String(raw.cefrLevel).toLowerCase();
    const next = (seq.get(k) ?? 0) + 1;
    const norm = normalizeReading(raw, next);
    if (!norm) {
      invalid++;
      continue;
    }
    norm.status = "published"; // all accepted items passed blind+review+integrity
    const parsed = readingItemSchema.safeParse(norm);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const key = dk(parsed.data);
    if (seen.has(key)) {
      dupe++;
      continue;
    }
    seen.add(key);
    seq.set(k, next);
    existing.push(parsed.data);
    added++;
  }
}
writeFileSync(OUT, `${JSON.stringify(existing, null, 2)}\n`);
const byCefr: Record<string, number> = {};
for (const it of existing)
  if (it.status === "published") byCefr[it.cefrLevel] = (byCefr[it.cefrLevel] ?? 0) + 1;
console.log(
  JSON.stringify({ added, dupe, invalid, totalReading: existing.length, publishedByCefr: byCefr }),
);
