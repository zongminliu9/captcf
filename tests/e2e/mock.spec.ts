import { expect, test } from "@playwright/test";
import { expireLatestMock } from "./db";

function toSeconds(clock: string): number {
  const parts = clock.trim().split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

test.describe("mock exam", () => {
  test("8 & 9. start a mock, answer, and the timer is refresh-safe", async ({ page }) => {
    await page.goto("/mock/mock_form_1/begin");
    await expect(page.getByRole("heading", { name: /Compréhension orale/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Commencer la section/ }).click();

    // timed QCM with a running clock
    const timer = page.getByRole("timer");
    await expect(timer).toBeVisible({ timeout: 20_000 });

    // answer the first question, then let a few seconds elapse
    await page.getByRole("radio").first().click();
    expect(page.url()).toContain("/mock/run/");
    await page.waitForTimeout(4000);
    const before = toSeconds(await timer.innerText());

    // reload → the server-computed remaining time keeps decreasing (not reset to 35:00),
    // and the previously chosen answer persists.
    await page.reload();
    await expect(page.getByRole("timer")).toBeVisible({ timeout: 20_000 });
    const after = toSeconds(await page.getByRole("timer").innerText());
    expect(after).toBeLessThan(35 * 60); // not reset to the full section time
    expect(after).toBeLessThanOrEqual(before + 1); // continued from where it was
    await expect(page.getByRole("radio").first()).toBeChecked();
  });

  test("10 & 11. expired mock auto-submits to a per-section result", async ({ page }) => {
    await page.goto("/mock/mock_form_1/begin");
    await page.getByRole("button", { name: /Commencer la section/ }).click();
    await page.getByRole("radio").first().waitFor({ timeout: 20_000 });
    await page.getByRole("radio").first().click();

    await expireLatestMock();

    await page.goto(page.url()); // reload the runner → server auto-submits
    await expect(page.getByRole("heading", { name: /Votre analyse/ })).toBeVisible({ timeout: 25_000 });
    // per-skill section card present
    await expect(page.getByText(/Compréhension (orale|écrite)/).first()).toBeVisible();
  });
});
