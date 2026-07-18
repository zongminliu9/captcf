/**
 * Native, project-local PostgreSQL manager (no Docker required).
 *
 * Creates an isolated cluster under ./.pgdata listening on 127.0.0.1:$PGPORT with
 * trust auth, so it never collides with any system Postgres and needs no sudo.
 *
 *   pnpm db:up      -> initdb (first run), start, ensure roles + databases
 *   pnpm db:down    -> stop the cluster
 *   pnpm db:status  -> report readiness
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, projectRoot } from "./lib/env";

loadEnv();

const PG_BIN = process.env.PAOS_POSTGRES_BIN ?? `${process.env.HOME}/.local/postgresql/bin`;
const DATA_DIR = resolve(projectRoot, ".pgdata");
const SOCKET_DIR = "/tmp/captcf-pg"; // spaces-free path for the unix socket
const PORT = process.env.PGPORT ?? "5433";
const USER = process.env.PGUSER ?? "captcf";
const DB = process.env.PGDATABASE ?? "captcf";
const TEST_DB = `${DB}_test`;
const LOG = resolve(DATA_DIR, "postgresql.log");

function bin(name: string): string {
  const p = resolve(PG_BIN, name);
  if (!existsSync(p)) {
    throw new Error(`PostgreSQL binary not found: ${p}. Set PAOS_POSTGRES_BIN.`);
  }
  return p;
}

function run(cmd: string, args: string[], opts: { quiet?: boolean } = {}) {
  const res = spawnSync(cmd, args, {
    stdio: opts.quiet ? "pipe" : "inherit",
    encoding: "utf8",
  });
  return res;
}

function isRunning(): boolean {
  const res = run(bin("pg_isready"), ["-h", "127.0.0.1", "-p", PORT, "-q"], { quiet: true });
  return res.status === 0;
}

function psql(sql: string, db = "postgres") {
  return spawnSync(
    bin("psql"),
    ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", db, "-tAc", sql],
    { encoding: "utf8" },
  );
}

function ensureDatabase(name: string) {
  const check = psql(`SELECT 1 FROM pg_database WHERE datname = '${name}'`);
  if (check.stdout.trim() === "1") {
    console.log(`  • database "${name}" already exists`);
    return;
  }
  const res = run(bin("createdb"), ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-O", USER, name]);
  if (res.status !== 0) throw new Error(`Failed to create database ${name}`);
  console.log(`  • created database "${name}"`);
}

function up() {
  mkdirSync(SOCKET_DIR, { recursive: true });

  if (!existsSync(resolve(DATA_DIR, "PG_VERSION"))) {
    console.log("→ Initialising a fresh PostgreSQL cluster (first run)…");
    const res = run(bin("initdb"), [
      "-D",
      DATA_DIR,
      "-U",
      USER,
      "--auth=trust",
      "--encoding=UTF8",
      "--locale=C",
    ]);
    if (res.status !== 0) throw new Error("initdb failed");
  }

  if (isRunning()) {
    console.log("→ PostgreSQL already running.");
  } else {
    console.log(`→ Starting PostgreSQL on 127.0.0.1:${PORT}…`);
    const res = run(bin("pg_ctl"), [
      "-D",
      DATA_DIR,
      "-l",
      LOG,
      "-w",
      "-o",
      `-p ${PORT} -k ${SOCKET_DIR} -h 127.0.0.1 -c listen_addresses=127.0.0.1`,
      "start",
    ]);
    if (res.status !== 0) {
      console.error(`pg_ctl start failed. Check the log at ${LOG}`);
      throw new Error("Failed to start PostgreSQL");
    }
  }

  // wait until ready
  for (let i = 0; i < 30 && !isRunning(); i++) {
    spawnSync("sleep", ["0.3"]);
  }
  if (!isRunning()) throw new Error("PostgreSQL did not become ready in time");

  ensureDatabase(DB);
  ensureDatabase(TEST_DB);
  console.log(`✓ PostgreSQL ready → postgres://${USER}@localhost:${PORT}/${DB}`);
}

function down() {
  if (!existsSync(resolve(DATA_DIR, "PG_VERSION"))) {
    console.log("No cluster to stop.");
    return;
  }
  const res = run(bin("pg_ctl"), ["-D", DATA_DIR, "-m", "fast", "stop"]);
  if (res.status === 0) console.log("✓ PostgreSQL stopped.");
  else console.log("PostgreSQL was not running.");
}

function status() {
  console.log(isRunning() ? "✓ running" : "✗ not running");
  process.exit(isRunning() ? 0 : 1);
}

const cmd = process.argv[2];
try {
  if (cmd === "up") up();
  else if (cmd === "down") down();
  else if (cmd === "status") status();
  else {
    console.error("Usage: tsx scripts/pg.ts <up|down|status>");
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}
