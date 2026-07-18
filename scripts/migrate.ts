import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnv } from "./lib/env";

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf";
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  console.log("→ Running migrations…");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✓ Migrations applied.");
  await sql.end();
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});
