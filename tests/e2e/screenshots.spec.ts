import { test } from "@playwright/test";
import { completeSession, login } from "./helpers";

const DIR = "docs/screenshots";
const shot = (name: string) => ({ path: `${DIR}/${name}.png`, fullPage: false as const });

// Captures the key screens required in the delivery report.
test("capture key screens (desktop)", async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto("/");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot(shot("01-home"));

  await page.goto("/pricing");
  await page.screenshot(shot("12-pricing"));

  await page.goto("/diagnostic");
  await page.screenshot(shot("02-diagnostic"));

  await login(page, "demo@captcf.app", "demo-captcf-2026");
  await page.screenshot(shot("03-dashboard-empty"));

  // quick practice → capture the runner, then complete to capture results
  await page.goto("/practice/start?mode=quick");
  await page.getByRole("radio").first().waitFor({ timeout: 20_000 });
  await page.screenshot(shot("04-quick-practice"));
  await completeSession(page);
  await page.screenshot(shot("08-results"));

  await page.goto("/dashboard");
  await page.screenshot(shot("03-dashboard"));

  await page.goto("/listening");
  await page.screenshot(shot("05-listening"));
  await page.goto("/reading");
  await page.screenshot(shot("06-reading"));
  await page.goto("/writing");
  await page.screenshot(shot("09-writing"));
  await page.goto("/speaking");
  await page.screenshot(shot("10-speaking"));
  await page.goto("/progress");
  await page.screenshot(shot("11-progress"));

  // mock exam runner
  await page.goto("/mock/mock_form_1/begin");
  await page.getByRole("button", { name: /Commencer la section/ }).click();
  await page.getByRole("timer").waitFor({ timeout: 20_000 });
  await page.screenshot(shot("07-mock-exam"));

  // admin (switch account → clear the current session first)
  await page.context().clearCookies();
  await login(page, "admin@captcf.app", "admin-captcf-2026");
  await page.goto("/admin");
  await page.screenshot(shot("14-admin"));
  await page.goto("/admin/questions");
  await page.screenshot(shot("14-admin-questions"));
});
