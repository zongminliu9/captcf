import { expect, test } from "@playwright/test";
import { login } from "./helpers";

function validQuestionJson(id: string): string {
  return JSON.stringify([
    {
      id,
      slug: id.replace(/_/g, "-"),
      skill: "reading",
      subtype: "correspondence",
      topic: "travail",
      cefrLevel: "B1",
      targetNclc: 6,
      stem: "Que demande l'auteur du message ?",
      options: [
        { id: "a", text: "Un rendez-vous la semaine prochaine." },
        { id: "b", text: "Un remboursement immédiat." },
        { id: "c", text: "Une lettre de recommandation." },
        { id: "d", text: "Un changement d'adresse." },
      ],
      correctAnswer: "a",
      explanation: "L'auteur propose explicitement de se rencontrer la semaine prochaine.",
      distractorRationales: {
        b: "Aucun remboursement n'est mentionné.",
        c: "La lettre n'apparaît pas dans le texte.",
        d: "L'adresse n'est pas le sujet du message.",
      },
      vocabulary: [],
      estimatedSeconds: 60,
      difficultyEvidence: "Compréhension d'une intention explicite dans un message courant.",
      author: "Admin E2E",
      passage: { title: "Message", text: "Bonjour, seriez-vous disponible la semaine prochaine pour un rendez-vous ? Merci." },
    },
  ]);
}

test.describe("admin content management", () => {
  test("18. admin imports valid content", async ({ page }) => {
    await login(page, "admin@captcf.app", "admin-captcf-2026");
    await page.goto("/admin/import");
    const id = `reading_e2e_${Math.floor(Math.random() * 1e6)}`.replace(/(\d{4})\d*/, "$1");
    const uniqueId = `reading_e2e${Math.floor(Math.random() * 9000 + 1000)}_0001`;
    await page.getByLabel("Contenu JSON à importer").fill(validQuestionJson(uniqueId));
    await page.getByRole("button", { name: /^Importer$/ }).click();
    await expect(page.getByText(/importée|prêtes à importer/)).toBeVisible({ timeout: 15_000 });
    void id;
  });

  test("19. admin rejects invalid content atomically", async ({ page }) => {
    await login(page, "admin@captcf.app", "admin-captcf-2026");
    await page.goto("/admin/import");
    // missing required fields → schema invalid
    await page.getByLabel("Contenu JSON à importer").fill('[{"id":"bad","skill":"reading"}]');
    await page.getByRole("button", { name: /^Importer$/ }).click();
    await expect(page.getByText(/erreur|rien n'a été importé/i)).toBeVisible({ timeout: 15_000 });
  });

  test("non-admin cannot reach the admin area", async ({ page }) => {
    await login(page, "free@captcf.app", "demo-captcf-2026");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
