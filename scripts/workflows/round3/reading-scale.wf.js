export const meta = {
  name: "captcf-r3-reading-scale",
  description: "Round 3: scale reading bank toward 40 sets (author -> blind solve -> review -> fix+persist)",
  phases: [
    { title: "Author", detail: "draft original reading items per CEFR bucket" },
    { title: "Solve", detail: "independent blind solver re-answers without the key" },
    { title: "Review", detail: "French + assessment reviewer, strict" },
    { title: "Persist", detail: "repair survivors and write batch JSON to staging" },
  ],
};

const OPTION = { type: "object", required: ["id", "text"], additionalProperties: false, properties: { id: { enum: ["a", "b", "c", "d"] }, text: { type: "string", minLength: 1 } } };
const VOCAB = { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["term", "gloss_en", "gloss_zh"], properties: { term: { type: "string" }, gloss_en: { type: "string" }, gloss_zh: { type: "string" } } } };
const RAT = { type: "object", additionalProperties: false, properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" }, d: { type: "string" } } };

const READING_ITEM = {
  type: "object", additionalProperties: false,
  required: ["cefrLevel", "subtype", "topic", "targetNclc", "passageTitle", "passageText", "stem", "options", "correctAnswer", "explanation", "distractorRationales", "vocabulary", "estimatedSeconds", "difficultyEvidence"],
  properties: {
    cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    subtype: { enum: ["notice", "correspondence", "informative", "argumentative", "abstract"] },
    topic: { type: "string" }, targetNclc: { type: "integer", minimum: 3, maximum: 11 },
    passageTitle: { type: "string" }, passageText: { type: "string", minLength: 20 },
    stem: { type: "string", minLength: 3 }, options: { type: "array", minItems: 4, maxItems: 4, items: OPTION },
    correctAnswer: { enum: ["a", "b", "c", "d"] }, explanation: { type: "string", minLength: 10 },
    distractorRationales: RAT, vocabulary: VOCAB, estimatedSeconds: { type: "integer", minimum: 10, maximum: 240 }, difficultyEvidence: { type: "string", minLength: 5 },
  },
};
const authorSchema = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: READING_ITEM } } };
const SOLVE_SCHEMA = { type: "object", additionalProperties: false, required: ["answers"], properties: { answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "chosenAnswer", "confident"], properties: { index: { type: "integer" }, chosenAnswer: { enum: ["a", "b", "c", "d"] }, confident: { type: "boolean" } } } } } };
const REVIEW_SCHEMA = { type: "object", additionalProperties: false, required: ["verdicts"], properties: { verdicts: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "singleCorrect", "naturalFrench", "canadaAppropriate", "answerLeak", "difficultyOk", "frenchQuality", "verdict", "notes"], properties: { index: { type: "integer" }, singleCorrect: { type: "boolean" }, naturalFrench: { type: "boolean" }, canadaAppropriate: { type: "boolean" }, answerLeak: { type: "boolean" }, difficultyOk: { type: "boolean" }, frenchQuality: { type: "integer", minimum: 0, maximum: 100 }, verdict: { enum: ["keep", "revise", "drop"] }, notes: { type: "string" } } } } } };
const PERSIST_SCHEMA = { type: "object", additionalProperties: false, required: ["file", "kept", "dropped"], properties: { file: { type: "string" }, kept: { type: "integer" }, dropped: { type: "integer" } } };

const TOPICS = "vie_quotidienne, travail, etudes, services_publics, immigration, societe, culture, medias, environnement, sante, logement, transport, loisirs, technologie";
const COMMON = `You create ORIGINAL practice content for CapTCF (TCF Canada prep). Everything ORIGINAL — never copy real/leaked exam items, competitor question banks, or other apps. Natural, idiomatic Canadian French; correct « » guillemets, accents, register. Each MCQ has EXACTLY ONE unambiguously correct answer + 3 plausible-but-clearly-wrong distractors. Never leak the answer via option length or wording; vary which letter is correct. distractorRationales = one short reason per NON-correct option only (never for the correct one). Difficulty must come from genuine comprehension demand (inference, attitude, cohesion, implication, argument structure), NOT from obscure vocabulary — especially at C1/C2. No meta commentary, no markdown fences.`;

const BUCKETS = (typeof args === "object" && args && args.buckets)
  ? args.buckets
  : [
      { cefr: "A1", count: 126 },
      { cefr: "A2", count: 228 },
      { cefr: "B1", count: 318 },
    ];
const BATCH = 10;

const batches = [];
for (const b of BUCKETS) {
  let rem = b.count, part = 0;
  while (rem > 0) { const n = Math.min(BATCH, rem); batches.push({ cefr: b.cefr, n, part: part++ }); rem -= n; }
}
log(`reading scale-up: ${batches.length} batches, ${BUCKETS.reduce((s, b) => s + b.count, 0)} target items`);

const results = await pipeline(
  batches,
  (b, _o, i) => agent(
    `${COMMON}

Write ${b.n} ORIGINAL reading MCQ items at CEFR ${b.cefr}.
Passage types to spread across: notice (affiche/avis), correspondence (courriel/lettre), informative (article factuel), argumentative (opinion/débat), abstract (texte conceptuel — C1/C2 only).
Spread topics across: ${TOPICS}. Use concrete, specific Canadian settings (Montréal, Québec, Ottawa, Moncton, Sherbrooke, Trois-Rivières, Winnipeg…), realistic institutions (IRCC, CLSC, SAAQ, commission scolaire, Emploi-Québec), and varied names.
Passage length by level: A1 25–60 words, A2 60–110, B1 110–200, B2 200–320, C1 300–450, C2 350–500.
Distinctness seed ${b.cefr}-${b.part}-${i}: avoid clichéd first ideas (no generic "réunion reportée"); each scenario must be concrete and unlike the others in this batch.
Return {items:[...]}.`,
    { label: `author:reading:${b.cefr}#${b.part}`, phase: "Author", schema: authorSchema, effort: "high" }
  ).then((r) => ({ batch: b, items: r?.items ?? [] })),

  async (authored) => {
    const items = authored.items;
    if (!items.length) return { ...authored, answers: [] };
    const blind = items.map((it, idx) => ({ index: idx, title: it.passageTitle, text: it.passageText, stem: it.stem, options: it.options }));
    const r = await agent(
      `You are an INDEPENDENT TCF Canada test-taker. For each item you get the passage, stem and 4 options but NOT the answer key. Choose the single best answer and say whether you are confident. Answer honestly from the text alone. Return {answers:[...]}.
${JSON.stringify(blind)}`,
      { label: `solve:reading:${authored.batch.cefr}#${authored.batch.part}`, phase: "Solve", schema: SOLVE_SCHEMA, effort: "high" }
    );
    return { ...authored, answers: r?.answers ?? [] };
  },

  async (solved) => {
    const items = solved.items;
    if (!items.length) return { ...solved, verdicts: [] };
    const r = await agent(
      `You are a senior French-language reviewer AND assessment reviewer for TCF Canada (Canadian French). For each item judge strictly:
- singleCorrect: exactly one defensible answer from the passage
- naturalFrench: idiomatic, correct accents/guillemets, right register
- canadaAppropriate: vocabulary/institutions/settings fit Canada
- answerLeak: does option length/wording betray the key?
- difficultyOk: matches its CEFR through real comprehension demand (not rare words)
- frenchQuality 0-100, verdict keep/revise/drop, notes
Return {verdicts:[...]}.
ITEMS:
${JSON.stringify(items.map((it, i) => ({ index: i, ...it })))}`,
      { label: `review:reading:${solved.batch.cefr}#${solved.batch.part}`, phase: "Review", schema: REVIEW_SCHEMA, effort: "high" }
    );
    return { ...solved, verdicts: r?.verdicts ?? [] };
  },

  async (reviewed) => {
    const { items, answers, verdicts, batch } = reviewed;
    if (!items.length) return { file: null, kept: 0, dropped: 0, cefr: batch.cefr, part: batch.part };
    const keep = [], toFix = [];
    for (let idx = 0; idx < items.length; idx++) {
      const sol = answers.find((a) => a.index === idx);
      const v = verdicts.find((x) => x.index === idx);
      const blindAgree = !!sol && sol.chosenAnswer === items[idx].correctAnswer;
      const clean = v && v.singleCorrect && v.naturalFrench && v.canadaAppropriate && !v.answerLeak && v.difficultyOk && v.frenchQuality >= 80 && blindAgree && v.verdict === "keep";
      if (clean) keep.push({ ...items[idx], _qa: { blindAgree: true, frenchQuality: v.frenchQuality, reviewer: "review-pass", verdict: "published" } });
      else if (v && v.verdict !== "drop") toFix.push({ item: items[idx], feedback: v, blindSolverPicked: sol?.chosenAnswer, blindAgree });
    }
    const file = `content/round3-staging/reading/${batch.cefr}-${String(batch.part).padStart(3, "0")}.json`;
    const r = await agent(
      `${COMMON}

You are a senior editor finalising a reading batch.

STEP 1 — Repair the flagged items below so each has EXACTLY ONE correct answer (the one an independent blind solver would pick), natural Canada-appropriate French, no answer leak, distractorRationales covering exactly the three non-correct options, an explanation that cites the passage, and a correct CEFR label. If an item is unsalvageable, omit it entirely.
FLAGGED (${toFix.length}):
${JSON.stringify(toFix)}

STEP 2 — Combine your repaired items with these already-clean items (do NOT modify the clean ones):
${JSON.stringify(keep)}

STEP 3 — Write the combined array as a JSON array to the file \`${file}\` (relative to the repo root /Users/michael/France website) using the Write tool. Each element must keep the full item shape plus its \`_qa\` field; give repaired items \`_qa: {"blindAgree": true, "frenchQuality": <0-100>, "reviewer": "editor-fix", "verdict": "published"}\`. The file must be valid JSON (an array, no markdown fences).

STEP 4 — Return {file, kept, dropped} where kept = number of items written and dropped = ${items.length} minus kept.`,
      { label: `persist:reading:${batch.cefr}#${batch.part}`, phase: "Persist", schema: PERSIST_SCHEMA, effort: "high" }
    );
    return { file: r?.file ?? file, kept: r?.kept ?? 0, dropped: r?.dropped ?? 0, cefr: batch.cefr, part: batch.part };
  }
);

const ok = results.filter(Boolean);
const totalKept = ok.reduce((s, r) => s + (r.kept || 0), 0);
const totalDropped = ok.reduce((s, r) => s + (r.dropped || 0), 0);
const byCefr = {};
for (const r of ok) byCefr[r.cefr] = (byCefr[r.cefr] || 0) + (r.kept || 0);
log(`reading scale-up done: kept ${totalKept}, dropped ${totalDropped}`);
return { totalKept, totalDropped, byCefr, batches: ok.length, files: ok.filter((r) => r.file).length };
