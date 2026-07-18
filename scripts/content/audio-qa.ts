/**
 * Listening audio QA report. Reads the generated manifest + listening bank, tallies quality
 * tiers, flags issues, writes docs/content/AUDIO_QA_REPORT.md. Fails (exit 1) if any published
 * listening item's audio is missing or graded `rejected`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, projectRoot } from "../lib/env";
import { loadContent } from "./lib/load-files";

loadEnv();

function main() {
  const manifestPath = resolve(projectRoot, "public/audio/manifest.json");
  const manifest: Record<string, any> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
  const listening = loadContent().listening.filter((l: any) => l.status === "published");

  const tiers: Record<string, number> = {
    premium_ready: 0,
    reviewed_tts: 0,
    prototype_tts: 0,
    rejected: 0,
  };
  const missing: string[] = [];
  const rejected: string[] = [];
  const flagged: string[] = [];

  for (const item of listening) {
    const m = manifest[item.id];
    const fileOnDisk =
      item.audio?.file &&
      existsSync(resolve(projectRoot, "public", item.audio.file.replace(/^\//, "")));
    if (!m || !fileOnDisk) {
      missing.push(item.id);
      continue;
    }
    const q = m.quality ?? "prototype_tts";
    tiers[q] = (tiers[q] ?? 0) + 1;
    if (q === "rejected") rejected.push(item.id);
    else if (q === "prototype_tts") flagged.push(item.id);
  }

  const usable = (tiers.premium_ready ?? 0) + (tiers.reviewed_tts ?? 0);
  const lines = [
    "# Audio QA report",
    "",
    "TTS clips are QA-graded automatically (loudness-normalized, silence/truncation checked, voice",
    "distinctness). `premium_ready` is reserved for explicit admin approval; automation tops out at",
    "`reviewed_tts`. All audio is synthesised (macOS `say`), honestly labelled — not human-recorded.",
    "",
    `- Published listening items: **${listening.length}**`,
    `- Usable in mocks (reviewed_tts + premium_ready): **${usable}**`,
    "",
    "| Tier | Count |",
    "| --- | ---: |",
    `| premium_ready | ${tiers.premium_ready ?? 0} |`,
    `| reviewed_tts | ${tiers.reviewed_tts ?? 0} |`,
    `| prototype_tts | ${tiers.prototype_tts ?? 0} |`,
    `| rejected | ${tiers.rejected ?? 0} |`,
    `| missing audio | ${missing.length} |`,
    "",
    `Rejected: ${rejected.length ? rejected.join(", ") : "none"}`,
    "",
    `Missing: ${missing.length ? missing.join(", ") : "none"}`,
    "",
    "Review + approve/regenerate clips in the admin QA queue at `/admin/audio`.",
  ];
  const docs = resolve(projectRoot, "docs/content");
  mkdirSync(docs, { recursive: true });
  writeFileSync(resolve(docs, "AUDIO_QA_REPORT.md"), `${lines.join("\n")}\n`);

  console.log(`\n Audio QA — published listening ${listening.length}`);
  console.log(
    `  premium_ready ${tiers.premium_ready ?? 0} · reviewed_tts ${tiers.reviewed_tts ?? 0} · prototype_tts ${tiers.prototype_tts ?? 0} · rejected ${tiers.rejected ?? 0} · missing ${missing.length}`,
  );
  console.log(`  report → docs/content/AUDIO_QA_REPORT.md\n`);

  if (rejected.length || missing.length) {
    for (const id of [
      ...rejected.map((x) => `rejected ${x}`),
      ...missing.map((x) => `missing ${x}`),
    ].slice(0, 30))
      console.log(`  ✗ ${id}`);
    process.exitCode = 1;
  }
}

main();
