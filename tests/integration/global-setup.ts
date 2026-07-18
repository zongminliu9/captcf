import { execSync } from "node:child_process";

/** Ensure the integration test DB schema exists (migrate captcf_test) before tests run. */
export default function setup() {
  const DATABASE_URL =
    process.env.E2E_DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test";
  execSync("pnpm exec tsx scripts/migrate.ts", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL },
    stdio: "inherit",
  });
  execSync("pnpm exec tsx scripts/seed.ts", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL },
    stdio: "inherit",
  });
}
