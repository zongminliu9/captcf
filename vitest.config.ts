import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "server-only": resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
          exclude: ["tests/integration/**", "tests/e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 30000,
          hookTimeout: 90000,
          fileParallelism: false,
          globalSetup: ["tests/integration/global-setup.ts"],
          env: {
            DATABASE_URL:
              process.env.E2E_DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test",
          },
        },
      },
    ],
  },
});
