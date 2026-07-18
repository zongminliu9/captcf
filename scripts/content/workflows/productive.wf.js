export const meta = {
  name: "captcf-productive-content",
  description: "Generate original TCF Canada writing tasks, speaking tasks, and vocabulary (author→reviewer)",
  phases: [
    { title: "Author", detail: "draft tasks / vocab" },
    { title: "Review", detail: "language + task-fit check" },
  ],
};

const COMMON = `You create ORIGINAL content for CapTCF, a TCF Canada prep app (Canadian French for immigration).
Rules: everything original (no copied prompts/answers), natural idiomatic Canadian French, correct French punctuation and accents, no meta commentary, no markdown, no placeholders.`;

const TOPICS = "vie_quotidienne, travail, etudes, services_publics, immigration, societe, culture, medias, environnement, sante, logement, transport, loisirs, technologie";

const WRITING_ITEM = {
  type: "object", additionalProperties: false,
  required: ["taskNumber", "cefrTarget", "topic", "targetNclc", "promptFr", "contextFr", "keywords", "minWords", "maxWords", "suggestedMinutes", "modelAnswerFr", "rubricNotesFr"],
  properties: {
    taskNumber: { enum: [1, 2, 3] },
    cefrTarget: { enum: ["A2", "B1", "B2", "C1"] },
    topic: { type: "string" },
    targetNclc: { type: "integer", minimum: 4, maximum: 10 },
    promptFr: { type: "string", minLength: 10 },
    contextFr: { type: "string", minLength: 5 },
    keywords: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } },
    minWords: { type: "integer" }, maxWords: { type: "integer" },
    suggestedMinutes: { type: "integer", minimum: 5, maximum: 40 },
    modelAnswerFr: { type: "string", minLength: 60 },
    rubricNotesFr: { type: "string", minLength: 20 },
  },
};

const SPEAKING_ITEM = {
  type: "object", additionalProperties: false,
  required: ["taskNumber", "cefrTarget", "topic", "targetNclc", "promptFr", "contextFr", "keywords", "prepSeconds", "speakSeconds", "guidingPointsFr", "modelOutlineFr"],
  properties: {
    taskNumber: { enum: [1, 2, 3] },
    cefrTarget: { enum: ["A2", "B1", "B2", "C1"] },
    topic: { type: "string" },
    targetNclc: { type: "integer", minimum: 4, maximum: 10 },
    promptFr: { type: "string", minLength: 10 },
    contextFr: { type: "string", minLength: 5 },
    keywords: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } },
    prepSeconds: { type: "integer", minimum: 0, maximum: 240 },
    speakSeconds: { type: "integer", minimum: 60, maximum: 400 },
    guidingPointsFr: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    modelOutlineFr: { type: "string", minLength: 30 },
  },
};

const VOCAB_ITEM = {
  type: "object", additionalProperties: false,
  required: ["term", "partOfSpeech", "cefrLevel", "topic", "definitionFr", "gloss_en", "gloss_zh", "exampleFr", "register"],
  properties: {
    term: { type: "string" },
    partOfSpeech: { enum: ["nom", "verbe", "adjectif", "adverbe", "expression", "locution"] },
    cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    topic: { type: "string" },
    definitionFr: { type: "string", minLength: 5 },
    gloss_en: { type: "string" }, gloss_zh: { type: "string" },
    exampleFr: { type: "string", minLength: 5 },
    register: { enum: ["standard", "familier", "soutenu"] },
  },
};

const listSchema = (item) => ({ type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: item } } });

// ── Writing tasks (task1: 60–120w, task2: 120–150w, task3: 120–180w) ──
phase("Author");
const writingSpecs = [
  { taskNumber: 1, min: 60, max: 120, mins: 15, n: 15, desc: "Tâche 1 — short message (invitation, note, apology, request) to friends/acquaintances. cefrTarget A2–B1." },
  { taskNumber: 2, min: 120, max: 150, mins: 20, n: 15, desc: "Tâche 2 — report an event/experience for a blog, newsletter, or forum. cefrTarget B1–B2." },
  { taskNumber: 3, min: 120, max: 180, mins: 25, n: 15, desc: "Tâche 3 — compare two opposing points of view on a general topic and defend a position. cefrTarget B2–C1." },
];
const speakingSpecs = [
  { taskNumber: 1, prep: 0, speak: 120, n: 15, desc: "Tâche 1 — unprepared guided interview: talk about yourself, your life, your projects. cefrTarget A2–B1." },
  { taskNumber: 2, prep: 120, speak: 330, n: 15, desc: "Tâche 2 — role-play: gather information to accomplish a real-life task (2 min prep). Provide the scenario + the info the candidate must obtain. cefrTarget B1–B2." },
  { taskNumber: 3, prep: 0, speak: 270, n: 15, desc: "Tâche 3 — express and justify an opinion on a general/societal topic. cefrTarget B2–C1." },
];

const writingBatches = writingSpecs.flatMap((s) => [{ ...s, half: "a", n: Math.ceil(s.n / 2) }, { ...s, half: "b", n: Math.floor(s.n / 2) }]);
const speakingBatches = speakingSpecs.flatMap((s) => [{ ...s, half: "a", n: Math.ceil(s.n / 2) }, { ...s, half: "b", n: Math.floor(s.n / 2) }]);
const vocabTopics = TOPICS.split(", ");

const [writing, speaking, vocab] = await parallel([
  () =>
    pipeline(
      writingBatches,
      (b, _o, i) =>
        agent(`${COMMON}\nWrite ${b.n} ORIGINAL TCF Canada ${`writing task ${b.taskNumber}`}. ${b.desc}\nEach: promptFr (the instruction to the candidate), contextFr (situation), keywords (content points a strong answer should cover), minWords=${b.min}, maxWords=${b.max}, suggestedMinutes=${b.mins}, modelAnswerFr (an original example answer within the word range), rubricNotesFr (what distinguishes a strong vs weak response). Vary topics across: ${TOPICS}. Batch ${b.half}-${i}.\nReturn {items:[...]}.`, { label: `author:writing:t${b.taskNumber}${b.half}`, phase: "Author", schema: listSchema(WRITING_ITEM), effort: "high" }).then((r) => r?.items ?? []),
      async (items) => {
        if (!items.length) return [];
        const rev = await agent(`${COMMON}\nReview these writing tasks. For each, confirm the prompt is clear, achievable in the word count, culturally appropriate, and the modelAnswerFr is natural, error-free French within range. Fix any French errors and return the corrected {items:[...]} (same shape). Drop any that are unsalvageable.\n${JSON.stringify(items)}`, { label: "review:writing", phase: "Review", schema: listSchema(WRITING_ITEM), effort: "high" });
        return (rev?.items ?? items).map((it) => ({ ...it, _reviewed: true }));
      },
    ),
  () =>
    pipeline(
      speakingBatches,
      (b, _o, i) =>
        agent(`${COMMON}\nWrite ${b.n} ORIGINAL TCF Canada speaking task ${b.taskNumber}. ${b.desc}\nEach: promptFr, contextFr, keywords, prepSeconds=${b.prep}, speakSeconds=${b.speak}, guidingPointsFr (2–6 bullet prompts to structure the answer), modelOutlineFr (an original model outline/answer). Vary topics across: ${TOPICS}. Batch ${b.half}-${i}.\nReturn {items:[...]}.`, { label: `author:speaking:t${b.taskNumber}${b.half}`, phase: "Author", schema: listSchema(SPEAKING_ITEM), effort: "high" }).then((r) => r?.items ?? []),
      async (items) => {
        if (!items.length) return [];
        const rev = await agent(`${COMMON}\nReview these speaking tasks for clarity, achievability in the time limit, cultural appropriateness, and natural French. Fix errors and return corrected {items:[...]}. Drop unsalvageable ones.\n${JSON.stringify(items)}`, { label: "review:speaking", phase: "Review", schema: listSchema(SPEAKING_ITEM), effort: "high" });
        return (rev?.items ?? items).map((it) => ({ ...it, _reviewed: true }));
      },
    ),
  () =>
    pipeline(
      vocabTopics,
      (topic, _o, i) =>
        agent(`${COMMON}\nProduce ~32 ORIGINAL high-value TCF Canada vocabulary entries on the topic "${topic}", spread across CEFR A2–C1 (a few A1/C2 ok). Each: term (French, may be a word, collocation, or expression), partOfSpeech, cefrLevel, topic="${topic}", definitionFr (short French definition), gloss_en, gloss_zh (Simplified Chinese), exampleFr (natural sentence), register. Avoid trivial cognates; favour words genuinely useful for the exam. No duplicates.\nReturn {items:[...]}.`, { label: `author:vocab:${topic}`, phase: "Author", schema: listSchema(VOCAB_ITEM), effort: "medium" }).then((r) => r?.items ?? []),
    ),
]);

const writingFlat = writing.filter(Boolean).flat();
const speakingFlat = speaking.filter(Boolean).flat();
const vocabFlat = vocab.filter(Boolean).flat();
log(`writing: ${writingFlat.length}, speaking: ${speakingFlat.length}, vocab: ${vocabFlat.length}`);
return { writing: writingFlat, speaking: speakingFlat, vocabulary: vocabFlat };
