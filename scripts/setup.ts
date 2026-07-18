/**
 * One-command project setup. Idempotent.
 *   env check → .env → Postgres up → migrate → seed → audio check → print access info
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { loadEnv, projectRoot } from "./lib/env";

function step(msg: string) {
  console.log(`\n\x1b[1m→ ${msg}\x1b[0m`);
}

function run(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: projectRoot });
  if (res.status !== 0) {
    console.error(`\x1b[31m✗ Command failed: ${cmd} ${args.join(" ")}\x1b[0m`);
    process.exit(1);
  }
}

function ensureEnv(): void {
  const envPath = resolve(projectRoot, ".env");
  if (existsSync(envPath)) return;
  step("Creating .env from .env.example");
  const example = readFileSync(resolve(projectRoot, ".env.example"), "utf8");
  const secret = randomBytes(32).toString("hex");
  writeFileSync(envPath, example.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`));
  console.log("  .env created with a random AUTH_SECRET.");
}

function main() {
  step("Checking Node.js");
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) {
    console.error(`Node 20+ required (found ${process.versions.node}).`);
    process.exit(1);
  }
  console.log(`  Node ${process.versions.node} ✓`);

  ensureEnv();
  loadEnv();

  step("Starting local PostgreSQL");
  run("pnpm", ["exec", "tsx", "scripts/pg.ts", "up"]);

  step("Running migrations");
  run("pnpm", ["exec", "tsx", "scripts/migrate.ts"]);

  step("Checking listening audio");
  const audioDir = resolve(projectRoot, "public/audio");
  const hasAudio = existsSync(audioDir) && readdirSync(audioDir).some((f) => f.endsWith(".m4a"));
  if (hasAudio) {
    console.log(`  ${readdirSync(audioDir).filter((f) => f.endsWith(".m4a")).length} audio files present ✓`);
  } else if (process.platform === "darwin") {
    step("Generating listening audio (macOS say + afconvert)");
    run("pnpm", ["exec", "tsx", "scripts/content/audio.ts"]);
  } else {
    console.log(
      "  ⚠ No audio files and not on macOS — listening audio ships committed in the repo; " +
        "on a clean clone they should already be present.",
    );
  }

  step("Seeding content + demo accounts");
  run("pnpm", ["exec", "tsx", "scripts/seed.ts"]);

  console.log("\n\x1b[32m✓ Setup complete.\x1b[0m");
  console.log("\n  Start the app:   \x1b[1mpnpm dev\x1b[0m   →   http://localhost:3000");
  console.log("\n  Demo accounts (development only):");
  console.log("    Learner (Premium):  demo@captcf.app   / demo-captcf-2026");
  console.log("    Learner (Free):     free@captcf.app   / demo-captcf-2026");
  console.log("    Admin:              admin@captcf.app  / admin-captcf-2026\n");
}

main();
