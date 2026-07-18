import { expect, test } from "@playwright/test";

test.describe("webkit smoke", () => {
  test("home renders and a guest can start practice on WebKit/Safari", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .getByRole("link", { name: /Commencer gratuitement/ })
      .first()
      .click();
    await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 25_000 });
  });
});
