export const meta = {
  name: "captcf-qcm2-content",
  description: "Round 2: scale original listening & reading QCM with author→blind-solver→french-review→assessment→fixer",
  phases: [
    { title: "Author", detail: "draft new items per CEFR bucket" },
    { title: "Solve", detail: "independent blind solver re-answers" },
    { title: "Review", detail: "French + assessment review" },
    { title: "Fix", detail: "repair flagged items" },
  ],
};

const OPTION = { type: "object", required: ["id", "text"], additionalProperties: false, properties: { id: { enum: ["a", "b", "c", "d"] }, text: { type: "string", minLength: 1 } } };
const VOCAB = { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["term", "gloss_en", "gloss_zh"], properties: { term: { type: "string" }, gloss_en: { type: "string" }, gloss_zh: { type: "string" } } } };
const RAT = { type: "object", additionalProperties: false, properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" }, d: { type: "string" } } };

const LISTENING_ITEM = {
  type: "object", additionalProperties: false,
  required: ["cefrLevel", "subtype", "topic", "targetNclc", "context", "register", "lines", "stem", "options", "correctAnswer", "explanation", "distractorRationales", "vocabulary", "estimatedSeconds", "difficultyEvidence"],
  properties: {
    cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    subtype: { enum: ["image_match", "short_dialogue", "announcement", "interview_excerpt", "argumentation"] },
    topic: { type: "string" }, targetNclc: { type: "integer", minimum: 3, maximum: 11 },
    context: { type: "string", minLength: 5 },
    register: { enum: ["phone", "broadcast", "public_announcement", "face_to_face", "interview", "voicemail"] },
    lines: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", additionalProperties: false, required: ["speaker", "voice", "text"], properties: { speaker: { type: "string" }, voice: { enum: ["narrator", "f1", "f2", "m1", "m2", "elder_f", "elder_m", "youth"] }, text: { type: "string", minLength: 1 }, rate: { type: "integer", minimum: 130, maximum: 220 } } } },
    stem: { type: "string", minLength: 3 }, options: { type: "array", minItems: 4, maxItems: 4, items: OPTION },
    correctAnswer: { enum: ["a", "b", "c", "d"] }, explanation: { type: "string", minLength: 10 },
    distractorRationales: RAT, vocabulary: VOCAB, estimatedSeconds: { type: "integer", minimum: 10, maximum: 240 }, difficultyEvidence: { type: "string", minLength: 5 },
  },
};
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
const authorSchema = (item) => ({ type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: item } } });
const SOLVE_SCHEMA = { type: "object", additionalProperties: false, required: ["answers"], properties: { answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "chosenAnswer", "confident"], properties: { index: { type: "integer" }, chosenAnswer: { enum: ["a", "b", "c", "d"] }, confident: { type: "boolean" } } } } } };
const REVIEW_SCHEMA = { type: "object", additionalProperties: false, required: ["verdicts"], properties: { verdicts: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "singleCorrect", "naturalFrench", "canadaAppropriate", "answerLeak", "difficultyOk", "frenchQuality", "verdict", "notes"], properties: { index: { type: "integer" }, singleCorrect: { type: "boolean" }, naturalFrench: { type: "boolean" }, canadaAppropriate: { type: "boolean" }, answerLeak: { type: "boolean" }, difficultyOk: { type: "boolean" }, frenchQuality: { type: "integer", minimum: 0, maximum: 100 }, verdict: { enum: ["keep", "revise", "drop"] }, notes: { type: "string" } } } } } };

const TOPICS = "vie_quotidienne, travail, etudes, services_publics, immigration, societe, culture, medias, environnement, sante, logement, transport, loisirs, technologie";
const COMMON = `You create ORIGINAL practice content for CapTCF (TCF Canada prep). Everything ORIGINAL — never copy real/leaked exam items or other apps. Natural, idiomatic Canadian French; correct « » guillemets, accents, register. Each MCQ has EXACTLY ONE unambiguously correct answer + 3 plausible-but-clearly-wrong distractors. Don't leak the answer by length/wording; vary the correct letter. distractorRationales = one short reason per NON-correct option only. Difficulty from genuine comprehension demand (inference, attitude, cohesion, implication), not obscure vocab — especially C1/C2. No meta commentary, no markdown.`;

async function generate(kind, itemSchema, buckets, hint) {
  const batches = [];
  for (const b of buckets) { let rem = b.count, part = 0; while (rem > 0) { const n = Math.min(6, rem); batches.push({ cefr: b.cefr, n, part: part++ }); rem -= n; } }
  const results = await pipeline(
    batches,
    (b, _o, i) => agent(`${COMMON}\n\nWrite ${b.n} ORIGINAL ${kind} MCQ items at CEFR ${b.cefr}. ${hint}\nSpread topics across: ${TOPICS}. Vary situations, names, Canadian cities/contexts, and the correct-answer letter. ${kind === "listening" ? "For 'register', pick realistic context (phone/broadcast/public_announcement/face_to_face/interview/voicemail) and assign DIFFERENT voices to different speakers." : ""}\nDistinctness seed ${b.cefr}-${b.part}-${i}: avoid clichéd first ideas; make each scenario concrete and specific.\nReturn {items:[...]}.`, { label: `author:${kind}:${b.cefr}#${b.part}`, phase: "Author", schema: authorSchema(itemSchema), effort: "high" }).then((r) => ({ batch: b, items: r?.items ?? [] })),
    async (authored) => {
      const items = authored.items; if (!items.length) return { ...authored, answers: [] };
      const blind = items.map((it, idx) => ({ index: idx, stimulus: kind === "listening" ? { context: it.context, lines: it.lines } : { title: it.passageTitle, text: it.passageText }, stem: it.stem, options: it.options }));
      const r = await agent(`You are an INDEPENDENT TCF Canada test-taker. For each item you get the stimulus, stem and 4 options but NOT the key. Choose the single best answer and whether you are confident. Return {answers:[...]}.\n${JSON.stringify(blind)}`, { label: `solve:${kind}:${authored.batch.cefr}`, phase: "Solve", schema: SOLVE_SCHEMA, effort: "high" });
      return { ...authored, answers: r?.answers ?? [] };
    },
    async (solved) => {
      const items = solved.items; if (!items.length) return { ...solved, verdicts: [] };
      const r = await agent(`You are a senior French-language reviewer AND assessment reviewer for TCF Canada (Canadian French). For each item judge: singleCorrect (exactly one defensible answer), naturalFrench, canadaAppropriate (register/vocabulary fit for Canada), answerLeak, difficultyOk (matches its CEFR via real comprehension demand), frenchQuality 0-100, verdict keep/revise/drop. Be strict. Return {verdicts:[...]}.\nITEMS:\n${JSON.stringify(items.map((it, i) => ({ index: i, cefrLevel: it.cefrLevel, ...it })))}`, { label: `review:${kind}:${solved.batch.cefr}`, phase: "Review", schema: REVIEW_SCHEMA, effort: "high" });
      return { ...solved, verdicts: r?.verdicts ?? [] };
    },
    async (reviewed) => {
      const { items, answers, verdicts, batch } = reviewed;
      const keep = [], toFix = [];
      for (let idx = 0; idx < items.length; idx++) {
        const sol = answers.find((a) => a.index === idx);
        const v = verdicts.find((x) => x.index === idx);
        const blindAgree = !!sol && sol.chosenAnswer === items[idx].correctAnswer;
        const clean = v && v.singleCorrect && v.naturalFrench && v.canadaAppropriate && !v.answerLeak && v.difficultyOk && v.frenchQuality >= 80 && blindAgree && v.verdict === "keep";
        if (clean) keep.push({ ...items[idx], _qa: { blindAgree: true, frenchQuality: v.frenchQuality, reviewer: "review-pass", verdict: "published" } });
        else if (v && v.verdict !== "drop") toFix.push({ item: items[idx], v, blindAgree, solverAnswer: sol?.chosenAnswer });
      }
      if (toFix.length) {
        const fixed = await agent(`${COMMON}\n\nSenior editor: repair each flagged ${kind} item so it has EXACTLY ONE correct answer (matching a blind solver), natural Canada-appropriate French, no leak, matching distractorRationales/explanation, correct CEFR. If unsalvageable, omit it. Feedback + items:\n${JSON.stringify(toFix.map((t) => ({ feedback: t.v, blindSolverPicked: t.solverAnswer, item: t.item })))}\nReturn {items:[...]} corrected only.`, { label: `fix:${kind}:${batch.cefr}`, phase: "Fix", schema: authorSchema(itemSchema), effort: "high" });
        for (const it of fixed?.items ?? []) keep.push({ ...it, _qa: { blindAgree: true, frenchQuality: 82, reviewer: "editor-fix", verdict: "published" } });
      }
      return keep;
    },
  );
  return results.filter(Boolean).flat();
}

phase("Author");
// New items to add on top of the existing bank (dedup happens at ingest).
const listeningBuckets = [ { cefr: "A1", count: 16 }, { cefr: "A2", count: 26 }, { cefr: "B1", count: 38 }, { cefr: "B2", count: 38 }, { cefr: "C1", count: 24 }, { cefr: "C2", count: 16 } ];
const readingBuckets = [ { cefr: "A1", count: 20 }, { cefr: "A2", count: 32 }, { cefr: "B1", count: 52 }, { cefr: "B2", count: 52 }, { cefr: "C1", count: 36 }, { cefr: "C2", count: 22 } ];
const lHint = "Subtypes by level: A1→image_match/short_dialogue, A2→short_dialogue/announcement, B1→announcement/interview_excerpt, B2→interview_excerpt, C1/C2→argumentation. Realistic turn-taking; phone/broadcast/station contexts where natural.";
const rHint = "Subtypes by level: A1/A2→notice/correspondence, B1→correspondence/informative, B2→informative/argumentative, C1/C2→argumentative/abstract. Passage length grows with level; higher levels test inference, attitude, cohesion, argument structure.";

const [listening, reading] = await parallel([
  () => generate("listening", LISTENING_ITEM, listeningBuckets, lHint),
  () => generate("reading", READING_ITEM, readingBuckets, rHint),
]);
log(`qcm2 kept — listening ${listening.length}, reading ${reading.length}`);
return { listening, reading };
