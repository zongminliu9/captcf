import { expect, type Page } from "@playwright/test";

/** Answer every question in a learning-mode session and submit → returns on the results page. */
export async function completeSession(page: Page) {
  for (let guard = 0; guard < 60; guard++) {
    // pick the first answer option
    const options = page.getByRole("radio");
    await options.first().waitFor({ state: "visible", timeout: 15_000 });
    await options.first().click();

    const finish = page.getByRole("button", { name: /Terminer la séance/ });
    const next = page.getByRole("button", { name: /^Suivant/ });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      break;
    }
    await next.click();
  }
  await expect(page.getByRole("heading", { name: /Votre analyse/ })).toBeVisible({ timeout: 20_000 });
}

export function uniqueEmail(prefix = "e2e"): string {
  // avoid Date.now import concerns — use performance + random
  return `${prefix}.${Math.floor(Math.random() * 1e9)}.${process.pid}@captcf.test`;
}

export async function register(page: Page, email: string, password = "captcf-e2e-2026") {
  await page.goto("/register");
  await page.getByLabel("Courriel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Courriel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}
