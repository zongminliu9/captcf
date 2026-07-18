import { expect, test } from "@playwright/test";

const LONG_TEXT =
  "Bonjour Nadia et Karim, je vous invite à souper chez moi samedi prochain vers dix-huit heures. " +
  "D'abord, je vais préparer un bon repas maison avec une soupe et un plat principal. Ensuite, on pourra " +
  "discuter tranquillement. Mon adresse est au 12 rue Cartier, tout près du parc. Pourriez-vous apporter " +
  "le dessert, s'il vous plaît ? J'ai vraiment hâte de vous voir. Donnez-moi une réponse d'ici jeudi. À bientôt !";

test.describe("productive skills (no AI key)", () => {
  test("14. writing gets deterministic local feedback", async ({ page }) => {
    await page.goto("/writing");
    await page.getByRole("link").filter({ hasText: /.+/ }).first();
    // open the first task card
    const firstTask = page.locator('a[href^="/writing/writing_"]').first();
    await firstTask.click();
    await page.getByLabel("Zone de rédaction").fill(LONG_TEXT);
    await page.getByRole("button", { name: /Soumettre pour analyse/ }).click();
    await expect(page.getByRole("heading", { name: /Votre analyse/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Estimation locale/)).toBeVisible();
    await expect(page.getByText(/\/ 20/).first()).toBeVisible();
  });

  test("15. speaking records with a mic and produces a self-evaluation", async ({ page }) => {
    // headless Chromium's fake audio device hangs getUserMedia, so provide a real
    // synthetic MediaStream (an oscillator tone) — this exercises the full recorder
    // pipeline (record → playback → upload → local self-eval) without real hardware.
    await page.addInitScript(() => {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.frequency.value = 220;
        osc.connect(dst);
        osc.start();
        return dst.stream;
      };
    });
    await page.goto("/speaking");
    await page.locator('a[href^="/speaking/speaking_"]').first().click();
    await page.getByRole("button", { name: /Autoriser le micro et commencer/ }).click();
    // recording started (or prep first) → wait for the stop button then record ~2s
    const stop = page.getByRole("button", { name: /Arrêter/ });
    await stop.waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2500);
    await stop.click();
    await page.getByRole("button", { name: /^Soumettre$/ }).click();
    await expect(page.getByText(/Estimation locale/)).toBeVisible({ timeout: 25_000 });
  });

  test("16. denied microphone shows a sensible fallback path", async ({ page }) => {
    await page.addInitScript(() => {
      // simulate a browser where the mic is blocked
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
        },
      });
    });
    await page.goto("/speaking");
    await page.locator('a[href^="/speaking/speaking_"]').first().click();
    await page.getByRole("button", { name: /Autoriser le micro et commencer/ }).click();
    await expect(page.getByText(/micro est bloqué|Aucun micro détecté/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Réessayer le micro/ })).toBeVisible();
  });
});
