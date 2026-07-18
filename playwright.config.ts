import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Use localhost (not 127.0.0.1) so it matches the host Next's dev server puts in
// redirect Location headers — otherwise guest cookies scoped to one host aren't
// sent to the other and auth/guest sessions break across redirects.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // grant microphone so the speaking recorder flow can be exercised headlessly
    permissions: [],
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [/\.mobile\.spec\.ts/, /\.webkit\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
    {
      name: "mobile",
      testMatch: /\.mobile\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
    {
      name: "webkit",
      testMatch: /\.webkit\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    // dev mode → non-secure cookies work over http on 127.0.0.1; isolated test DB
    command: `pnpm exec next dev -p ${PORT}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "development",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test",
      AUTH_SECRET: "e2e-test-secret-e2e-test-secret-32chars",
      ENABLE_DEMO_ACCOUNTS: "true",
      PAYMENTS_PROVIDER: "simulator",
    },
  },
});
