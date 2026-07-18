import { expect, test } from "@playwright/test";
import { completeSession } from "./helpers";

test.describe("mobile experience", () => {
  test("17. mobile completes a short practice with bottom navigation", async ({ page }) => {
    await page.goto("/dashboard");
    // mobile bottom navigation is present
    await expect(page.getByRole("navigation", { name: /Navigation mobile/ })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/13-mobile-navigation.png" });

    await page.goto("/practice/start?mode=quick");
    await completeSession(page);
    await expect(page.getByText(/699/).first()).toBeVisible();
  });

  test("home has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
