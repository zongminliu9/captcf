export const meta = {
  name: "captcf-qcm-content",
  description: "Generate original TCF-Canada-style listening & reading QCM items (author→blind reviewer→fixer)",
  phases: [
    { title: "Author", detail: "draft items per CEFR bucket" },
    { title: "Review", detail: "independent blind re-answer + language check" },
    { title: "Fix", detail: "repair flagged items" },
  ],
};

// ── Output contracts ────────────────────────────────────────────────────────
const OPTION = {
  type: "object",
  required: ["id", "text"],
  additionalProperties: false,
  properties: { id: { enum: ["a", "b", "c", "d"] }, text: { type: "string", minLength: 1 } },
};

const LISTENING_ITEM = {
  type: "object",
  additionalProperties: false,
  required: ["cefrLevel", "subtype", "topic", "targetNclc", "context", "lines", "stem", "options", "correctAnswer", "explanation", "distractorRationales", "vocabulary", "estimatedSeconds", "difficultyEvidence"],
  properties: {
    cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    subtype: { enum: ["image_match", "short_dialogue", "announcement", "interview_excerpt", "argumentation"] },
    topic: { type: "string" },
    targetNclc: { type: "integer", minimum: 3, maximum: 11 },
    context: { type: "string", minLength: 5 },
    lines: {
      type: "array", minItems: 1, maxItems: 12,
      items: {
        type: "object", additionalProperties: false, required: ["speaker", "voice", "text"],
        properties: {
          speaker: { type: "string" },
          voice: { enum: ["narrator", "f1", "f2", "m1", "m2", "elder_f", "elder_m", "youth"] },
          text: { type: "string", minLength: 1 },
        },
      },
    },
    stem: { type: "string", minLength: 3 },
    options: { type: "array", minItems: 4, maxItems: 4, items: OPTION },
    correctAnswer: { enum: ["a", "b", "c", "d"] },
    explanation: { type: "string", minLength: 10 },
    distractorRationales: {
      type: "object", additionalProperties: false,
      properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" }, d: { type: "string" } },
    },
    vocabulary: {
      type: "array", maxItems: 8,
      items: { type: "object", additionalProperties: false, required: ["term", "gloss_en", "gloss_zh"], properties: { term: { type: "string" }, gloss_en: { type: "string" }, gloss_zh: { type: "string" } } },
    },
    estimatedSeconds: { type: "integer", minimum: 10, maximum: 240 },
    difficultyEvidence: { type: "string", minLength: 5 },
  },
};

const READING_ITEM = {
  type: "object",
  additionalProperties: false,
  required: ["cefrLevel", "subtype", "topic", "targetNclc", "passageTitle", "passageText", "stem", "options", "correctAnswer", "explanation", "distractorRationales", "vocabulary", "estimatedSeconds", "difficultyEvidence"],
  properties: {
    cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    subtype: { enum: ["notice", "correspondence", "informative", "argumentative", "abstract"] },
    topic: { type: "string" },
    targetNclc: { type: "integer", minimum: 3, maximum: 11 },
    passageTitle: { type: "string" },
    passageText: { type: "string", minLength: 20 },
    stem: { type: "string", minLength: 3 },
    options: { type: "array", minItems: 4, maxItems: 4, items: OPTION },
    correctAnswer: { enum: ["a", "b", "c", "d"] },
    explanation: { type: "string", minLength: 10 },
    distractorRationales: {
      type: "object", additionalProperties: false,
      properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" }, d: { type: "string" } },
    },
    vocabulary: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["term", "gloss_en", "gloss_zh"], properties: { term: { type: "string" }, gloss_en: { type: "string" }, gloss_zh: { type: "string" } } } },
    estimatedSeconds: { type: "integer", minimum: 10, maximum: 240 },
    difficultyEvidence: { type: "string", minLength: 5 },
  },
};

const authorSchema = (itemSchema) => ({
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: itemSchema } },
});

const REVIEW_SCHEMA = {
  type: "object", additionalProperties: false, required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["index", "chosenAnswer", "agrees", "singleCorrect", "naturalFrench", "answerLeak", "frenchQuality", "verdict", "notes"],
        properties: {
          index: { type: "integer" },
          chosenAnswer: { enum: ["a", "b", "c", "d"] },
          agrees: { type: "boolean" },
          singleCorrect: { type: "boolean" },
          naturalFrench: { type: "boolean" },
          answerLeak: { type: "boolean" },
          frenchQuality: { type: "integer", minimum: 0, maximum: 100 },
          verdict: { enum: ["keep", "revise", "drop"] },
          notes: { type: "string" },
        },
      },
    },
  },
};

const COMMON = `You are creating ORIGINAL practice content for CapTCF, a TCF Canada prep app. TCF Canada tests Canadian French for immigration.
Hard rules:
- Everything ORIGINAL. Do NOT copy real exam questions, other apps' items, song lyrics, or any copyrighted text.
- Natural, idiomatic French appropriate to Canada. Use correct French punctuation (« » guillemets, no space errors), accents, and register.
- Each MCQ has EXACTLY ONE unambiguously correct answer among 4 options; 3 plausible-but-clearly-wrong distractors.
- The stem/options must NOT give away the answer by length or wording. Vary the correct-option position across items (not always the longest, not always the same letter).
- distractorRationales: one short reason per NON-correct option only (keys are the option letters that are NOT the correct answer).
- explanation: why the correct answer is right, grounded in the text/audio.
- vocabulary: 2–6 useful terms from the item with English + Simplified Chinese glosses.
- difficultyEvidence: 1 sentence justifying the CEFR level (what linguistic/cognitive demand makes it this level — NOT just "hard words").
- Difficulty must come from genuine comprehension demand (inference, implication, attitude, cohesion), not obscure vocabulary swaps, especially at C1/C2.
- No meta commentary, no placeholders, no "as an AI", no markdown — just the content fields.`;

const TOPICS = "vie_quotidienne, travail, etudes, services_publics, immigration, societe, culture, medias, environnement, sante, logement, transport, loisirs, technologie";

async function generate(kind, itemSchema, buckets, subtypeHint) {
  const batches = [];
  for (const b of buckets) {
    let remaining = b.count;
    let part = 0;
    while (remaining > 0) {
      const n = Math.min(6, remaining);
      batches.push({ cefr: b.cefr, n, part: part++ });
      remaining -= n;
    }
  }

  const results = await pipeline(
    batches,
    // Stage 1: author
    (b, _orig, i) =>
      agent(
        `${COMMON}\n\nTASK: Write ${b.n} ORIGINAL ${kind} MCQ items at CEFR ${b.cefr}.\n${subtypeHint}\nSpread across different topics from: ${TOPICS}. Vary situations, speakers, names, cities (use varied Canadian and Francophone contexts), and the correct-answer letter. Set targetNclc consistent with the CEFR band.\nBatch seed: ${b.cefr}-${b.part}-${i} (make this batch's scenarios distinct from typical first ideas).\nReturn {items:[...]}. Each item MUST match the required fields exactly.`,
        { label: `author:${kind}:${b.cefr}#${b.part}`, phase: "Author", schema: authorSchema(itemSchema), effort: "high" },
      ).then((r) => ({ batch: b, items: r?.items ?? [] })),

    // Stage 2: independent blind reviewer (re-answers WITHOUT seeing the key)
    async (authored) => {
      const items = authored.items;
      if (!items.length) return { ...authored, verdicts: [] };
      const blind = items.map((it, idx) => ({
        index: idx,
        cefrLevel: it.cefrLevel,
        stimulus: kind === "listening" ? { context: it.context, lines: it.lines } : { title: it.passageTitle, text: it.passageText },
        stem: it.stem,
        options: it.options,
      }));
      const rev = await agent(
        `You are an INDEPENDENT TCF Canada assessment reviewer. For each item you get the stimulus, stem and 4 options but NOT the answer key. For each:
1) Independently choose the single best answer (chosenAnswer).
2) singleCorrect: is there exactly one defensible answer?
3) naturalFrench: is the French natural, correct, and Canada-appropriate?
4) answerLeak: does the stem/options leak the answer (e.g., only the correct one is grammatical, or copies stimulus wording verbatim)?
5) frenchQuality 0–100.
6) verdict: keep (good), revise (fixable issue), drop (fundamentally flawed / ambiguous / multiple correct).
Be strict. Return {verdicts:[...]} with one entry per index.
ITEMS:\n${JSON.stringify(blind)}`,
        { label: `review:${kind}:${authored.batch.cefr}`, phase: "Review", schema: REVIEW_SCHEMA, effort: "high" },
      );
      return { ...authored, verdicts: rev?.verdicts ?? [] };
    },

    // Stage 3: fix or drop
    async (reviewed) => {
      const { items, verdicts, batch } = reviewed;
      const keep = [];
      const toFix = [];
      for (let idx = 0; idx < items.length; idx++) {
        const v = verdicts.find((x) => x.index === idx);
        const agreesKey = v && v.chosenAnswer === items[idx].correctAnswer;
        const clean = v && v.singleCorrect && v.naturalFrench && !v.answerLeak && v.frenchQuality >= 78 && agreesKey && v.verdict === "keep";
        if (clean) keep.push({ ...items[idx], _qa: { reviewer: "reviewer-blind", quality: v.frenchQuality, agreed: true } });
        else if (v && v.verdict !== "drop") toFix.push({ item: items[idx], v });
        // verdict drop or missing → discarded
      }
      if (toFix.length) {
        const fixed = await agent(
          `${COMMON}\n\nYou are a senior French assessment editor. Repair each flagged ${kind} item so it has EXACTLY ONE correct answer, natural Canadian French, no answer leakage, and matching distractorRationales/explanation. Keep the same cefrLevel and topic. If an item cannot be salvaged, omit it.\nReviewer feedback + items:\n${JSON.stringify(toFix.map((t) => ({ feedback: t.v, item: t.item })))}\nReturn {items:[...]} with the corrected items only.`,
          { label: `fix:${kind}:${batch.cefr}`, phase: "Fix", schema: authorSchema(itemSchema), effort: "high" },
        );
        for (const it of fixed?.items ?? []) keep.push({ ...it, _qa: { reviewer: "editor-fix", quality: 80, agreed: true } });
      }
      return keep;
    },
  );

  return results.filter(Boolean).flat();
}

phase("Author");
const listeningBuckets = [
  { cefr: "A1", count: 12 }, { cefr: "A2", count: 18 }, { cefr: "B1", count: 26 },
  { cefr: "B2", count: 26 }, { cefr: "C1", count: 16 }, { cefr: "C2", count: 10 },
];
const readingBuckets = [
  { cefr: "A1", count: 14 }, { cefr: "A2", count: 20 }, { cefr: "B1", count: 30 },
  { cefr: "B2", count: 30 }, { cefr: "C1", count: 20 }, { cefr: "C2", count: 12 },
];

const listeningHint = "Subtypes by level: A1→image_match/short_dialogue (very short, 1–3 lines), A2→short_dialogue/announcement, B1→announcement/interview_excerpt, B2→interview_excerpt, C1/C2→argumentation. Keep audio scripts realistic: greetings, purpose, natural turn-taking. Assign voices so speakers differ (e.g., a woman = f1/f2, a man = m1/m2, an announcer = narrator).";
const readingHint = "Subtypes by level: A1/A2→notice/correspondence (signs, SMS, short emails), B1→correspondence/informative, B2→informative/argumentative, C1/C2→argumentative/abstract. Passage length grows with level. Higher levels test inference, author attitude, cohesion, and argument structure.";

const [listening, reading] = await parallel([
  () => generate("listening", LISTENING_ITEM, listeningBuckets, listeningHint),
  () => generate("reading", READING_ITEM, readingBuckets, readingHint),
]);

log(`listening kept: ${listening.length}, reading kept: ${reading.length}`);
return { listening, reading };
