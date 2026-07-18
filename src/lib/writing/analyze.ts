/**
 * Deterministic local analysis for written expression — works with NO AI key.
 * Produces an explainable rubric and an UNOFFICIAL 0–20 estimate. When an AI provider
 * is configured, richer feedback is layered on top (see writing/provider).
 */

export interface WritingTaskLite {
  keywords: string[];
  minWords: number;
  maxWords: number;
  taskNumber: number;
}

export interface RubricCriterion {
  key: string;
  labelFr: string;
  score: number; // 0..100
  detailFr: string;
}

export interface WritingAnalysis {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  keywordCoverage: number; // 0..1
  matchedKeywords: string[];
  missingKeywords: string[];
  connectorsUsed: string[];
  repeatedWords: { word: string; count: number }[];
  wordCountStatus: "under" | "ok" | "over";
  criteria: RubricCriterion[];
  estimatedBand: number; // 0..20 UNOFFICIAL
  summaryFr: string;
  disclaimerFr: string;
}

// A representative set of French connectors/discourse markers.
const CONNECTORS = [
  "d'abord",
  "ensuite",
  "puis",
  "enfin",
  "finalement",
  "premièrement",
  "deuxièmement",
  "par ailleurs",
  "de plus",
  "en outre",
  "cependant",
  "toutefois",
  "néanmoins",
  "pourtant",
  "en revanche",
  "par contre",
  "donc",
  "ainsi",
  "par conséquent",
  "c'est pourquoi",
  "parce que",
  "car",
  "puisque",
  "grâce à",
  "à cause de",
  "en effet",
  "par exemple",
  "en conclusion",
  "pour conclure",
  "en résumé",
  "en somme",
  "d'une part",
  "d'autre part",
  "malgré",
  "bien que",
  "afin de",
  "pour que",
  "tandis que",
  "alors que",
];

const STOPWORDS = new Set([
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "de",
  "du",
  "et",
  "à",
  "a",
  "en",
  "que",
  "qui",
  "je",
  "tu",
  "il",
  "elle",
  "on",
  "nous",
  "vous",
  "ils",
  "elles",
  "ce",
  "cette",
  "ces",
  "est",
  "sont",
  "pour",
  "dans",
  "sur",
  "avec",
  "au",
  "aux",
  "se",
  "sa",
  "son",
  "ses",
  "ne",
  "pas",
  "plus",
  "mon",
  "ma",
  "mes",
  "votre",
  "vos",
  "notre",
  "nos",
  "leur",
  "leurs",
  "y",
  "d",
  "l",
  "j",
  "s",
  "n",
  "c",
  "qu",
  "me",
  "te",
  "si",
  "ou",
  "où",
  "par",
  "comme",
]);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function analyzeWriting(text: string, task: WritingTaskLite): WritingAnalysis {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const sentences = trimmed
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  const sentenceCount = sentences.length;
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const paragraphCount = Math.max(paragraphs.length, trimmed ? 1 : 0);
  const avgSentenceLength = sentenceCount ? Math.round(wordCount / sentenceCount) : 0;

  const normText = normalize(trimmed);
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const kw of task.keywords) {
    // match on the most salient token of the keyword phrase
    const core = normalize(kw)
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    const hit = core.length
      ? core.some((w) => normText.includes(w))
      : normText.includes(normalize(kw));
    (hit ? matchedKeywords : missingKeywords).push(kw);
  }
  const keywordCoverage = task.keywords.length ? matchedKeywords.length / task.keywords.length : 1;

  const connectorsUsed = CONNECTORS.filter((c) => normText.includes(normalize(c)));

  // repeated content words
  const freq = new Map<string, number>();
  for (const w of words) {
    const nw = normalize(w).replace(/[^a-zàâäéèêëîïôöùûüç']/gi, "");
    if (nw.length > 4 && !STOPWORDS.has(nw)) freq.set(nw, (freq.get(nw) ?? 0) + 1);
  }
  const repeatedWords = [...freq.entries()]
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const wordCountStatus: "under" | "ok" | "over" =
    wordCount < task.minWords ? "under" : wordCount > task.maxWords ? "over" : "ok";

  // ── criteria (0..100) ──
  const lengthScore =
    wordCountStatus === "ok"
      ? 100
      : wordCountStatus === "under"
        ? Math.round((wordCount / task.minWords) * 90)
        : Math.max(60, 100 - (wordCount - task.maxWords));
  const coverageScore = Math.round(keywordCoverage * 100);
  const structureScore = Math.min(
    100,
    (paragraphCount >= 2 ? 55 : 25) +
      (connectorsUsed.length >= 3 ? 45 : connectorsUsed.length * 12),
  );
  const cohesionScore = Math.min(100, 40 + connectorsUsed.length * 10);
  const varietyScore = Math.max(
    30,
    100 -
      repeatedWords.reduce((s, r) => s + (r.count - 3) * 8, 0) -
      (avgSentenceLength > 30 ? 20 : 0),
  );

  const criteria: RubricCriterion[] = [
    {
      key: "length",
      labelFr: "Respect de la consigne (longueur)",
      score: clamp(lengthScore),
      detailFr:
        wordCountStatus === "ok"
          ? `${wordCount} mots — dans la fourchette attendue (${task.minWords}–${task.maxWords}).`
          : wordCountStatus === "under"
            ? `${wordCount} mots — c'est trop court (visez au moins ${task.minWords}).`
            : `${wordCount} mots — c'est trop long (maximum ${task.maxWords}).`,
    },
    {
      key: "content",
      labelFr: "Contenu et points attendus",
      score: clamp(coverageScore),
      detailFr: missingKeywords.length
        ? `Points à développer : ${missingKeywords.slice(0, 5).join(", ")}.`
        : "Tous les éléments attendus semblent abordés.",
    },
    {
      key: "structure",
      labelFr: "Organisation",
      score: clamp(structureScore),
      detailFr: `${paragraphCount} paragraphe(s), ${connectorsUsed.length} connecteur(s) logique(s) repéré(s).`,
    },
    {
      key: "cohesion",
      labelFr: "Cohérence et enchaînement",
      score: clamp(cohesionScore),
      detailFr: connectorsUsed.length
        ? `Connecteurs utilisés : ${connectorsUsed.slice(0, 6).join(", ")}.`
        : "Ajoutez des connecteurs (d'abord, ensuite, cependant, donc…) pour relier vos idées.",
    },
    {
      key: "variety",
      labelFr: "Richesse et variété",
      score: clamp(varietyScore),
      detailFr: repeatedWords.length
        ? `Mots répétés : ${repeatedWords.map((r) => `${r.word} (${r.count}×)`).join(", ")}.`
        : `Phrase moyenne : ${avgSentenceLength} mots. Bonne variété lexicale.`,
    },
  ];

  const avg = criteria.reduce((s, c) => s + c.score, 0) / criteria.length;
  const estimatedBand = Math.round((avg / 100) * 20);

  const summaryFr =
    wordCountStatus !== "ok"
      ? "Ajustez d'abord la longueur, puis revoyez le contenu et l'organisation."
      : keywordCoverage < 0.6
        ? "Votre texte est bien dimensionné, mais plusieurs points attendus manquent."
        : avg >= 75
          ? "Bon travail : longueur, contenu et organisation sont au rendez-vous."
          : "Structure à renforcer : paragraphes clairs et connecteurs logiques.";

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    keywordCoverage,
    matchedKeywords,
    missingKeywords,
    connectorsUsed,
    repeatedWords,
    wordCountStatus,
    criteria,
    estimatedBand,
    summaryFr,
    disclaimerFr:
      "Analyse automatique locale, à titre indicatif seulement. Ce n'est pas une correction officielle ni une note du TCF Canada.",
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
