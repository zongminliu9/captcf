import { expect, test } from "@playwright/test";
import { expireLatestMock } from "./db";

// Provide a real synthetic MediaStream so the in-mock speaking recorders work headless.
const SYNTH_MIC = `
  const AC = window.AudioContext || window.webkitAudioContext;
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AC(); const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination(); osc.frequency.value = 210;
    osc.connect(dst); osc.start(); return dst.stream;
  };
`;

async function startSection(page: import("@playwright/test").Page) {
  const begin = page.getByRole("button", { name: /Commencer la section/ });
  await begin.waitFor({ state: "visible", timeout: 25_000 });
  await begin.click();
}

test.describe("unified full mock (CO+CE+EE+EO)", () => {
  test("9. completes all four sections in one attempt → unified result", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(SYNTH_MIC);

    await page.goto("/mock/mock_form_1/begin");

    // ── Section 1: Compréhension orale (QCM) ──
    await expect(page.getByRole("heading", { name: /Compréhension orale/ })).toBeVisible({
      timeout: 25_000,
    });
    await startSection(page);
    await page.getByRole("radio").first().waitFor({ timeout: 25_000 });
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: /Section suivante|Terminer/ }).click();

    // ── Section 2: Compréhension écrite (QCM) ──
    await expect(page.getByRole("heading", { name: /Compréhension écrite/ })).toBeVisible({
      timeout: 25_000,
    });
    await startSection(page);
    await page.getByRole("radio").first().waitFor({ timeout: 25_000 });
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: /Section suivante|Terminer/ }).click();

    // ── Section 3: Expression écrite (3 tasks) ──
    await expect(page.getByRole("heading", { name: /Expression écrite/ })).toBeVisible({
      timeout: 25_000,
    });
    await startSection(page);
    const area = page.getByLabel(/Rédaction tâche/);
    await area.waitFor({ timeout: 25_000 });
    await area.fill(
      "Bonjour, je vous écris pour organiser notre rencontre de la semaine prochaine. " +
        "D'abord, je propose mardi après-midi. Ensuite, nous pourrons discuter du projet en détail. " +
        "N'hésitez pas à me proposer un autre moment. Merci beaucoup et à bientôt.",
    );
    await page
      .getByRole("button", { name: /Terminer l'expression écrite|Terminer l'examen/ })
      .click();

    // ── Section 4: Expression orale (record one task, then finish) ──
    await expect(page.getByRole("heading", { name: /Expression orale/ })).toBeVisible({
      timeout: 25_000,
    });
    await startSection(page);
    const rec = page.getByRole("button", { name: /Enregistrer/ }).first();
    await rec.waitFor({ timeout: 25_000 });
    await rec.click();
    await page.waitForTimeout(1800);
    await page
      .getByRole("button", { name: /Arrêter/ })
      .first()
      .click();
    await expect(page.getByText(/Enregistré/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Terminer l'examen/ }).click();

    // ── Unified results ──
    await expect(page.getByRole("heading", { name: /Résultats de l'examen blanc/ })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByText(/Compréhension orale/).first()).toBeVisible();
    await expect(page.getByText(/auto-évaluation locale/).first()).toBeVisible(); // EE/EO band
  });

  test("resume: refresh mid-section keeps the timer + answers; finished sections can't reopen", async ({
    page,
  }) => {
    await page.goto("/mock/mock_form_1/begin");
    await startSection(page);
    await page.getByRole("radio").first().waitFor({ timeout: 25_000 });
    await page.getByRole("radio").first().click();
    const runUrl = page.url();
    await page.waitForTimeout(2500);
    await page.reload();
    // still in CO with the first answer checked
    await expect(page.getByRole("timer")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole("radio").first()).toBeChecked();

    // advance out of CO, then a reload must NOT return to CO (no redo)
    await page.getByRole("button", { name: /Section suivante|Terminer/ }).click();
    await expect(page.getByRole("heading", { name: /Compréhension écrite/ })).toBeVisible({
      timeout: 25_000,
    });
    await page.goto(runUrl);
    await expect(page.getByRole("heading", { name: /Compréhension orale/ })).toHaveCount(0);
  });

  test("10. expired section auto-submits the mock", async ({ page }) => {
    await page.goto("/mock/mock_form_1/begin");
    await startSection(page);
    await page.getByRole("radio").first().waitFor({ timeout: 25_000 });
    await page.getByRole("radio").first().click();
    await expireLatestMock(); // backdate all sections → server auto-submits
    await page.goto(page.url());
    await expect(page.getByRole("heading", { name: /Résultats de l'examen blanc/ })).toBeVisible({
      timeout: 25_000,
    });
  });
});
