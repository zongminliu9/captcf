import { expect, test } from "@playwright/test";
import { login, register, uniqueEmail } from "./helpers";

test.describe("entitlements & account", () => {
  test("21. free users are gated from premium mocks; premium are not", async ({ page }) => {
    await login(page, "free@captcf.app", "demo-captcf-2026");
    await page.goto("/mock/mock_form_2");
    await expect(page.getByRole("link", { name: /Débloquer avec Premium/ })).toBeVisible();

    // begin route redirects free users to pricing
    await page.goto("/mock/mock_form_2/begin");
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("premium users can start any mock", async ({ page }) => {
    await login(page, "demo@captcf.app", "demo-captcf-2026");
    await page.goto("/mock/mock_form_2/begin");
    await expect(page).toHaveURL(/\/mock\/run\//, { timeout: 20_000 });
  });

  test("simulator checkout upgrades a new user to premium", async ({ page }) => {
    await register(page, uniqueEmail("premium"));
    await page.goto("/api/billing/checkout");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    // now premium: can start a non-sample mock
    await page.goto("/mock/mock_form_3/begin");
    await expect(page).toHaveURL(/\/mock\/run\//, { timeout: 20_000 });
  });

  test("22. a user can delete their account", async ({ page }) => {
    await register(page, uniqueEmail("delete"));
    await page.goto("/settings");
    await page.getByRole("button", { name: /Supprimer mon compte/ }).click();
    await page.getByRole("button", { name: /Confirmer la suppression/ }).click();
    await expect(page).toHaveURL(/\/(\?deleted=1)?$/, { timeout: 20_000 });
  });

  test("20. core product works with no external API keys (guest, no login)", async ({ page }) => {
    await page.goto("/practice/start?mode=quick");
    await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("radio").first().click();
    await expect(page.getByText(/^(Correct|Incorrect)$/).first()).toBeVisible();
  });
});
