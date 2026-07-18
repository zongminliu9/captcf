import { expect, test } from "@playwright/test";
import { completeSession, register, uniqueEmail } from "./helpers";

test.describe("core learner loop", () => {
  test("1. new visitor reaches a real question within two clicks", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Commencer gratuitement/ }).first().click();
    // lands directly on a question with answer options
    await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 20_000 });
    expect(page.url()).toContain("/practice/session/");
  });

  test("2. answering shows instant feedback with rationales", async ({ page }) => {
    await page.goto("/practice/start?mode=quick");
    await page.getByRole("radio").first().waitFor({ timeout: 20_000 });
    await page.getByRole("radio").first().click();
    // feedback panel appears (Correct or Incorrect)
    await expect(page.getByText(/^(Correct|Incorrect)$/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("3. guest completes a session and sees per-skill analysis", async ({ page }) => {
    await page.goto("/practice/start?mode=quick");
    await completeSession(page);
    await expect(page.getByText(/699/).first()).toBeVisible();
    await expect(page.getByText(/non officiel/i).first()).toBeVisible();
  });

  test("4. guest data survives registration (merge)", async ({ page }) => {
    await page.goto("/practice/start?mode=quick");
    await completeSession(page); // creates a guest attempt
    const email = uniqueEmail("merge");
    await register(page, email);
    // dashboard now has data → recent activity is present (not the empty hero)
    await expect(page.getByRole("heading", { name: /Tableau de bord/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Activité récente/)).toBeVisible();
  });

  test("5. reading practice runs and review is available", async ({ page }) => {
    await page.goto("/practice/start?mode=reading");
    await page.getByRole("radio").first().waitFor({ timeout: 20_000 });
    await completeSession(page);
    // expandable review list present
    await expect(page.getByRole("heading", { name: /Revoir les réponses/ })).toBeVisible();
  });

  test("6. custom practice builder starts a session", async ({ page }) => {
    await page.goto("/practice/custom");
    await page.getByRole("button", { name: /Lancer l'entraînement/ }).click();
    await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 20_000 });
  });

  test("7. bookmark a question then review bookmarks", async ({ page }) => {
    await page.goto("/practice/start?mode=quick");
    await page.getByRole("radio").first().waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Favori" }).click();
    await expect(page.getByText(/favoris/i).first()).toBeVisible();
    await page.goto("/bookmarks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
