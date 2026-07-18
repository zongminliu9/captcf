import { describe, expect, it } from "vitest";
import { type WritingTaskLite, analyzeWriting } from "./analyze";

const task: WritingTaskLite = {
  keywords: ["invitation", "date et heure", "adresse", "dessert"],
  minWords: 60,
  maxWords: 120,
  taskNumber: 1,
};

describe("analyzeWriting", () => {
  it("flags a text that is too short", () => {
    const a = analyzeWriting("Bonjour, je t'invite.", task);
    expect(a.wordCountStatus).toBe("under");
    expect(a.criteria.find((c) => c.key === "length")!.score).toBeLessThan(100);
  });

  it("detects keyword coverage", () => {
    const text =
      "Salut ! Je t'envoie une invitation pour samedi. La date et l'heure : 18 h. Mon adresse est au 12 rue Cartier. Peux-tu apporter le dessert ? " +
      "On va bien manger ensemble et discuter longtemps ce soir-là avec les amis proches.";
    const a = analyzeWriting(text, task);
    expect(a.matchedKeywords.length).toBeGreaterThanOrEqual(3);
    expect(a.keywordCoverage).toBeGreaterThan(0.6);
  });

  it("counts connectors and rewards structure", () => {
    const text =
      "D'abord je me présente. Ensuite, je parle de mon travail. Cependant, j'aime aussi les loisirs.\n\nEn conclusion, donc, je pense que c'est important car cela aide beaucoup.";
    const a = analyzeWriting(text, task);
    expect(a.connectorsUsed.length).toBeGreaterThanOrEqual(3);
    expect(a.paragraphCount).toBe(2);
  });

  it("detects repeated words", () => {
    const text = `${"maison ".repeat(6)}et ${"famille ".repeat(5)}vraiment beaucoup ici maintenant toujours ensemble.`;
    const a = analyzeWriting(text, task);
    expect(a.repeatedWords.some((r) => r.word === "maison")).toBe(true);
  });

  it("produces an unofficial 0-20 estimate and disclaimer", () => {
    const a = analyzeWriting(
      "Bonjour, ceci est un texte de test suffisamment long pour analyser.",
      task,
    );
    expect(a.estimatedBand).toBeGreaterThanOrEqual(0);
    expect(a.estimatedBand).toBeLessThanOrEqual(20);
    expect(a.disclaimerFr.toLowerCase()).toContain("officielle");
  });
});
