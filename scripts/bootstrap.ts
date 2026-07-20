/**
 * Production bootstrap — runs ONCE per process start before `next start`, fast on warm boots.
 *
 * - Serialises concurrent boots with a PostgreSQL advisory lock (two instances can't double-seed).
 * - Applies only pending migrations.
 * - Seeds content ONLY when the content checksum changed (versioned `seed_state` marker), so a warm
 *   boot with an already-seeded DB skips the full 600+ item seed entirely.
 * - Fails loudly (exit 1) so the app never starts on a half-initialised DB.
 * - Emits structured timing logs (no secrets).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SPEC_VERSION } from "@/lib/exam/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { CONTENT_DIR } from "./content/lib/load-files";
import { loadEnv, projectRoot } from "./lib/env";
import { runSeed } from "./seed";

loadEnv();

// Fixed 32-bit key for the bootstrap advisory lock (arbitrary constant, stable across deploys).
const LOCK_KEY = 420732011;
const CONTENT_FILES = ["listening", "reading", "writing", "speaking", "vocabulary"];

function log(msg: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ t: "bootstrap", msg, ...extra }));
}

/** Deterministic checksum of the content inputs — changes exactly when content or spec changes. */
export function contentChecksum(): string {
  const h = createHash("sha256").update(`spec:${SPEC_VERSION}`);
  for (const name of CONTENT_FILES) {
    try {
      h.update(readFileSync(resolve(CONTENT_DIR, `${name}.json`)));
    } catch {
      h.update(`missing:${name}`);
    }
  }
  return h.digest("hex");
}

/** Returns whether a full seed was actually run. Safe to call repeatedly and concurrently. */
export async function bootstrap(): Promise<{ seeded: boolean; totalMs: number }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const started = Date.now();
  const sql = postgres(url, { max: 1 });
  let seeded = false;
  try {
    await sql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    log("lock acquired");

    const tMig = Date.now();
    await migrate(drizzle(sql), { migrationsFolder: resolve(projectRoot, "src/db/migrations") });
    log("migrations applied", { ms: Date.now() - tMig });

    await sql`CREATE TABLE IF NOT EXISTS seed_state (
      id int PRIMARY KEY DEFAULT 1,
      content_version text NOT NULL,
      spec_version text,
      applied_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT seed_state_singleton CHECK (id = 1)
    )`;

    const checksum = contentChecksum();
    const rows = await sql<{ content_version: string }[]>`
      SELECT content_version FROM seed_state WHERE id = 1`;

    if (rows[0]?.content_version === checksum) {
      log("content up to date — skipping seed", { version: checksum.slice(0, 12) });
    } else {
      log("content changed — seeding", {
        from: rows[0]?.content_version?.slice(0, 12) ?? null,
        to: checksum.slice(0, 12),
      });
      const tSeed = Date.now();
      await runSeed();
      await sql`
        INSERT INTO seed_state (id, content_version, spec_version, applied_at)
        VALUES (1, ${checksum}, ${SPEC_VERSION}, now())
        ON CONFLICT (id) DO UPDATE
          SET content_version = ${checksum}, spec_version = ${SPEC_VERSION}, applied_at = now()`;
      seeded = true;
      log("seed complete", { ms: Date.now() - tSeed });
    }
  } finally {
    // Release the lock even on failure so a retry isn't blocked; the caller decides exit code.
    await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`.catch(() => {});
    await sql.end({ timeout: 5 }).catch(() => {});
  }
  const totalMs = Date.now() - started;
  log("bootstrap done", { totalMs, seeded });
  return { seeded, totalMs };
}

// Direct run: `pnpm bootstrap` / `start:prod`. Fails loudly so the app never starts half-initialised.
if (process.argv[1]?.endsWith("bootstrap.ts")) {
  bootstrap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(
        JSON.stringify({
          t: "bootstrap",
          level: "error",
          msg: "bootstrap failed",
          error: String((err as Error).message),
        }),
      );
      process.exit(1);
    });
}
