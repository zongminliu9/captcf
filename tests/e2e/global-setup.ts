import { execSync } from "node:child_process";

/** Prepare the isolated E2E database: migrate + seed once before the suite runs. */
export default async function globalSetup() {
  const root = process.cwd();
  const DATABASE_URL =
    process.env.E2E_DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test";
  const env = { ...process.env, DATABASE_URL, ENABLE_DEMO_ACCOUNTS: "true" };

  console.log("[e2e] migrating test DB…");
  execSync("pnpm exec tsx scripts/migrate.ts", { cwd: root, env, stdio: "inherit" });
  console.log("[e2e] seeding test DB…");
  execSync("pnpm exec tsx scripts/seed.ts", { cwd: root, env, stdio: "inherit" });
}
