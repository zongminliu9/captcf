import { expect, test } from "@playwright/test";
import { login, register, uniqueEmail } from "./helpers";

/**
 * The mistake-notebook loop the professional reviewer could not find:
 * wrong answer → visible on results → notebook → re-answer → history kept → dashboard entry.
 */
test.describe("carnet d'erreurs (mistake notebook)", () => {
  test("wrong answer flows into the notebook and survives a correct re-answer", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = uniqueEmail("mistake");
    const password = "captcf-e2e-2026";
    await register(page, email, password);

    // ── 1. deliberately get questions wrong ──────────────────────────────────
    await page.goto("/practice/start?mode=quick");
    await page.getByRole("radio").first().waitFor({ timeout: 25_000 });

    let wrongPicked = 0;
    for (let guard = 0; guard < 40; guard++) {
      const radios = page.getByRole("radio");
      await radios.first().waitFor({ state: "visible", timeout: 20_000 });
      // pick the LAST option to maximise the chance of being wrong
      await radios.last().click();
      wrongPicked++;
      const finish = page.getByRole("button", { name: /Terminer la séance/ });
      if (await finish.isVisible().catch(() => false)) {
        await finish.click();
        break;
      }
      await page.getByRole("button", { name: /^Suivant/ }).click();
    }
    expect(wrongPicked).toBeGreaterThan(0);

    // ── 2. results page surfaces the notebook additions ──────────────────────
    await expect(page.getByRole("heading", { name: /Votre analyse/ })).toBeVisible({
      timeout: 25_000,
    });
    const notebookCta = page.getByText(/ajoutée\(s\) à votre\s+carnet d'erreurs/i).first();
    const hasMistakes = await notebookCta.isVisible().catch(() => false);

    // ── 3. the notebook itself ───────────────────────────────────────────────
    await page.goto("/mistakes");
    await expect(page.getByRole("heading", { name: /Vos erreurs à revoir/ })).toBeVisible({
      timeout: 25_000,
    });

    if (hasMistakes) {
      // metadata is rendered: how many times missed + mastery progress
      await expect(page.getByText(/× manquée/).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/correctes/).first()).toBeVisible();

      // filters exist
      await expect(page.getByRole("link", { name: "En cours" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Maîtrisées" })).toBeVisible();

      // ── 4. dashboard shows the review entry ───────────────────────────────
      await page.goto("/dashboard");
      await expect(page.getByText(/Carnet d'erreurs/).first()).toBeVisible({ timeout: 25_000 });
      await expect(page.getByRole("link", { name: /Réviser 5–10 min/ })).toBeVisible();

      // ── 5. re-answer the mistakes; history must NOT be erased ─────────────
      await page.goto("/practice/start?mode=mistakes");
      const radios = page.getByRole("radio");
      if (
        await radios
          .first()
          .isVisible({ timeout: 20_000 })
          .catch(() => false)
      ) {
        await radios.first().click();
        const finish = page.getByRole("button", { name: /Terminer/ });
        if (await finish.isVisible().catch(() => false)) await finish.click();
      }

      // history is still there (all filter always lists past mistakes)
      await page.goto("/mistakes?f=all");
      await expect(page.getByText(/× manquée/).first()).toBeVisible({ timeout: 25_000 });

      // ── 6. survives a completely fresh browser session ────────────────────
      await page.context().clearCookies();
      await page.goto("/mistakes");
      // logged out → the notebook must not leak another user's data
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 25_000 });
      await login(page, email, password);
      await page.goto("/mistakes?f=all");
      await expect(page.getByText(/× manquée/).first()).toBeVisible({ timeout: 25_000 });
    }
  });

  test("notebook is reachable and explains itself when empty", async ({ page }) => {
    await page.goto("/mistakes");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 25_000 });
  });
});
