/** Standalone near-duplicate scan across the content bank (report-only). */
import { loadEnv } from "../lib/env";
import { exactHashDuplicates, jaccardDuplicates } from "./lib/dedupe-lib";
import { loadContent } from "./lib/load-files";

loadEnv();

function scan(name: string, items: { id: string; text: string }[]) {
  const exact = exactHashDuplicates(items);
  const near = jaccardDuplicates(items, 0.82);
  console.log(`\n${name}: ${items.length} items`);
  console.log(`  exact duplicates: ${exact.length}`);
  for (const [a, b] of exact.slice(0, 10)) console.log(`    ${a} == ${b}`);
  console.log(`  near duplicates (Jaccard ≥ 0.82): ${near.length}`);
  for (const [a, b, s] of near.slice(0, 10)) console.log(`    ${a} ≈ ${b} (${s.toFixed(2)})`);
  return exact.length + near.length;
}

const c = loadContent();
let issues = 0;
issues += scan(
  "listening",
  c.listening.map((x) => ({ id: x.id, text: `${x.stem} ${x.transcript}` })),
);
issues += scan(
  "reading",
  c.reading.map((x) => ({ id: x.id, text: `${x.stem} ${x.passage.text}` })),
);
issues += scan(
  "writing",
  c.writing.map((x) => ({ id: x.id, text: x.promptFr })),
);
issues += scan(
  "speaking",
  c.speaking.map((x) => ({ id: x.id, text: x.promptFr })),
);
issues += scan(
  "vocabulary",
  c.vocabulary.map((x) => ({ id: x.id, text: x.term })),
);
console.log(`\nTotal duplicate signals: ${issues}\n`);
