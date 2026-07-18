import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./scripts/lib/env";

loadEnv();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf",
  },
  strict: true,
  verbose: true,
});
