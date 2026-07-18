/**
 * Generate real French-Canadian listening audio from listening scripts.
 *
 * Pipeline (macOS, no ffmpeg): `say` → WAV per line → Python concat with silence →
 * `afconvert` → AAC/m4a in public/audio. Multi-voice: each line is synthesised with its
 * roster voice, so speakers actually differ. Idempotent via a text-hash manifest.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, projectRoot } from "../lib/env";

loadEnv();

const CONTENT = resolve(projectRoot, "src/content/listening.json");
const AUDIO_DIR = resolve(projectRoot, "public/audio");
const MANIFEST = resolve(AUDIO_DIR, "manifest.json");
const TMP = resolve(projectRoot, "tmp-audio");
const CONCAT_PY = resolve(projectRoot, "scripts/content/lib/concat_wav.py");

// roster key → concrete macOS voice + default speaking rate (wpm)
const VOICE_MAP: Record<string, { voice: string; rate: number }> = {
  narrator: { voice: "Jacques", rate: 178 },
  f1: { voice: "Amélie", rate: 182 },
  f2: { voice: "Sandy (French (Canada))", rate: 180 },
  m1: { voice: "Thomas", rate: 176 },
  m2: { voice: "Reed (French (Canada))", rate: 178 },
  elder_f: { voice: "Grandma (French (Canada))", rate: 165 },
  elder_m: { voice: "Grandpa (French (Canada))", rate: 165 },
  youth: { voice: "Flo (French (Canada))", rate: 188 },
};
const FALLBACK = { voice: "Amélie", rate: 180 };

type Line = { speaker: string; voice: string; text: string; rate?: number };
type Item = {
  id: string;
  audio: { context: string; lines: Line[]; file: string | null; durationSeconds: number | null };
};

function hashItem(item: Item): string {
  const payload = item.audio.lines.map((l) => `${l.voice}|${l.rate ?? ""}|${l.text}`).join("‖");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function say(voice: string, rate: number, text: string, out: string): boolean {
  const res = spawnSync(
    "say",
    [
      "-v",
      voice,
      "-r",
      String(rate),
      "--data-format=LEI16@22050",
      "--file-format=WAVE",
      "-o",
      out,
      text,
    ],
    { encoding: "utf8" },
  );
  return res.status === 0 && existsSync(out);
}

function synthLine(line: Line, out: string): boolean {
  const cfg = VOICE_MAP[line.voice] ?? FALLBACK;
  const rate = line.rate ?? cfg.rate;
  if (say(cfg.voice, rate, line.text, out)) return true;
  // graceful fallback if a voice is unexpectedly unavailable
  return say(FALLBACK.voice, rate, line.text, out);
}

function main() {
  const force = process.argv.includes("--force");
  const items: Item[] = JSON.parse(readFileSync(CONTENT, "utf8"));
  mkdirSync(AUDIO_DIR, { recursive: true });
  mkdirSync(TMP, { recursive: true });
  const manifest: Record<
    string,
    { file: string; duration: number; textHash: string; voices: string[]; status: string }
  > = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const textHash = hashItem(item);
    const outFile = resolve(AUDIO_DIR, `${item.id}.m4a`);
    const rel = `/audio/${item.id}.m4a`;
    const prev = manifest[item.id];

    if (!force && prev && prev.textHash === textHash && existsSync(outFile)) {
      item.audio.file = rel;
      item.audio.durationSeconds = prev.duration;
      skipped++;
      continue;
    }

    // synthesise each line
    const wavs: string[] = [];
    let ok = true;
    item.audio.lines.forEach((line, i) => {
      const w = resolve(TMP, `${item.id}_${i}.wav`);
      if (synthLine(line, w)) wavs.push(w);
      else ok = false;
    });
    if (!ok || wavs.length === 0) {
      failed++;
      console.warn(`  ✗ ${item.id}: synthesis failed`);
      continue;
    }

    const combined = resolve(TMP, `${item.id}_combined.wav`);
    const concat = spawnSync("python3", [CONCAT_PY, combined, "0.4", ...wavs], {
      encoding: "utf8",
    });
    if (concat.status !== 0) {
      failed++;
      console.warn(`  ✗ ${item.id}: concat failed ${concat.stderr}`);
      continue;
    }
    const duration = Number.parseFloat((concat.stdout || "0").trim());

    const conv = spawnSync(
      "afconvert",
      ["-f", "m4af", "-d", "aac@44100", "-b", "96000", combined, outFile],
      { encoding: "utf8" },
    );
    if (conv.status !== 0 || !existsSync(outFile)) {
      failed++;
      console.warn(`  ✗ ${item.id}: afconvert failed ${conv.stderr}`);
      continue;
    }

    item.audio.file = rel;
    item.audio.durationSeconds = Math.round(duration);
    manifest[item.id] = {
      file: rel,
      duration: Math.round(duration),
      textHash,
      voices: [...new Set(item.audio.lines.map((l) => l.voice))],
      status: "generated",
    };
    generated++;
    // cleanup per-item temp
    for (const w of wavs) rmSync(w, { force: true });
    rmSync(combined, { force: true });
  }

  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(CONTENT, `${JSON.stringify(items, null, 2)}\n`);
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}

  console.log(
    `\n✓ Audio: ${generated} generated, ${skipped} unchanged, ${failed} failed → public/audio (${items.length} items)`,
  );
  if (failed > 0) process.exitCode = 1;
}

main();
