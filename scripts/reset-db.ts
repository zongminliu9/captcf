/**
 * Drop and recreate the public schema, then re-run migrations + seed.
 * Destructive — for local development only.
 */
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { loadEnv, projectRoot } from "./lib/env";

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf";
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to reset the database in production.");
    process.exit(1);
  }
  console.log("→ Dropping and recreating the public schema…");
  const sql = postgres(url, { max: 1 });
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql.end();

  console.log("→ Migrating…");
  spawnSync("pnpm", ["exec", "tsx", "scripts/migrate.ts"], { stdio: "inherit", cwd: projectRoot });
  console.log("→ Seeding…");
  spawnSync("pnpm", ["exec", "tsx", "scripts/seed.ts"], { stdio: "inherit", cwd: projectRoot });
  console.log("✓ Database reset.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
