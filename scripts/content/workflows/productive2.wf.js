export const meta = {
  name: "captcf-productive2",
  description: "Round 2 top-up: extra writing/speaking tasks + vocabulary (author→reviewer)",
  phases: [{ title: "Author" }, { title: "Review" }],
};

const COMMON = `You create ORIGINAL content for CapTCF (TCF Canada, Canadian French). Everything original, natural idiomatic Canadian French, correct punctuation/accents, no meta commentary, no markdown.`;
const TOPICS = "vie_quotidienne, travail, etudes, services_publics, immigration, societe, culture, medias, environnement, sante, logement, transport, loisirs, technologie";

const WRITING = { type: "object", additionalProperties: false, required: ["taskNumber", "cefrTarget", "topic", "targetNclc", "promptFr", "contextFr", "keywords", "minWords", "maxWords", "suggestedMinutes", "modelAnswerFr", "rubricNotesFr"], properties: { taskNumber: { enum: [1, 2, 3] }, cefrTarget: { enum: ["A2", "B1", "B2", "C1"] }, topic: { type: "string" }, targetNclc: { type: "integer", minimum: 4, maximum: 10 }, promptFr: { type: "string", minLength: 10 }, contextFr: { type: "string", minLength: 5 }, keywords: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } }, minWords: { type: "integer" }, maxWords: { type: "integer" }, suggestedMinutes: { type: "integer", minimum: 5, maximum: 40 }, modelAnswerFr: { type: "string", minLength: 60 }, rubricNotesFr: { type: "string", minLength: 20 } } };
const SPEAKING = { type: "object", additionalProperties: false, required: ["taskNumber", "cefrTarget", "topic", "targetNclc", "promptFr", "contextFr", "keywords", "prepSeconds", "speakSeconds", "guidingPointsFr", "modelOutlineFr"], properties: { taskNumber: { enum: [1, 2, 3] }, cefrTarget: { enum: ["A2", "B1", "B2", "C1"] }, topic: { type: "string" }, targetNclc: { type: "integer", minimum: 4, maximum: 10 }, promptFr: { type: "string", minLength: 10 }, contextFr: { type: "string", minLength: 5 }, keywords: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } }, prepSeconds: { type: "integer", minimum: 0, maximum: 240 }, speakSeconds: { type: "integer", minimum: 60, maximum: 400 }, guidingPointsFr: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } }, modelOutlineFr: { type: "string", minLength: 30 } } };
const VOCAB = { type: "object", additionalProperties: false, required: ["term", "partOfSpeech", "cefrLevel", "topic", "definitionFr", "gloss_en", "gloss_zh", "exampleFr", "register"], properties: { term: { type: "string" }, partOfSpeech: { enum: ["nom", "verbe", "adjectif", "adverbe", "expression", "locution"] }, cefrLevel: { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }, topic: { type: "string" }, definitionFr: { type: "string", minLength: 5 }, gloss_en: { type: "string" }, gloss_zh: { type: "string" }, exampleFr: { type: "string", minLength: 5 }, register: { enum: ["standard", "familier", "soutenu"] } } };
const list = (i) => ({ type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: i } } });

phase("Author");
const wSpecs = [
  { taskNumber: 1, min: 60, max: 120, mins: 15, n: 8, desc: "Tâche 1 — short message (invitation/note/apology/request) to friends. cefrTarget A2–B1." },
  { taskNumber: 2, min: 120, max: 150, mins: 20, n: 8, desc: "Tâche 2 — report an event/experience for a blog/forum. cefrTarget B1–B2." },
  { taskNumber: 3, min: 120, max: 180, mins: 25, n: 8, desc: "Tâche 3 — compare two opposing views and defend a position. cefrTarget B2–C1." },
];
const sSpecs = [
  { taskNumber: 1, prep: 0, speak: 120, n: 8, desc: "Tâche 1 — unprepared guided interview about yourself. cefrTarget A2–B1." },
  { taskNumber: 2, prep: 120, speak: 330, n: 8, desc: "Tâche 2 — role-play to gather info for a real-life task (2 min prep). cefrTarget B1–B2." },
  { taskNumber: 3, prep: 0, speak: 270, n: 8, desc: "Tâche 3 — express and justify an opinion on a societal topic. cefrTarget B2–C1." },
];
const vocabTopics = TOPICS.split(", ");

const [writing, speaking, vocab] = await parallel([
  () => pipeline(wSpecs, (b, _o, i) => agent(`${COMMON}\nWrite ${b.n} ORIGINAL TCF Canada writing task ${b.taskNumber}. ${b.desc} Each: promptFr, contextFr, keywords, minWords=${b.min}, maxWords=${b.max}, suggestedMinutes=${b.mins}, modelAnswerFr (in range), rubricNotesFr. Vary topics: ${TOPICS}. Seed ${i}. Return {items:[...]}.`, { label: `author:writing:t${b.taskNumber}`, phase: "Author", schema: list(WRITING), effort: "high" }).then((r) => r?.items ?? []),
    async (items) => { if (!items.length) return []; const rev = await agent(`${COMMON}\nReview + fix these writing tasks (clarity, achievability, natural French, model answer in range). Drop unsalvageable. Return {items:[...]}.\n${JSON.stringify(items)}`, { label: "review:writing", phase: "Review", schema: list(WRITING), effort: "high" }); return (rev?.items ?? items).map((it) => ({ ...it, _reviewed: true })); }),
  () => pipeline(sSpecs, (b, _o, i) => agent(`${COMMON}\nWrite ${b.n} ORIGINAL TCF Canada speaking task ${b.taskNumber}. ${b.desc} Each: promptFr, contextFr, keywords, prepSeconds=${b.prep}, speakSeconds=${b.speak}, guidingPointsFr, modelOutlineFr. Vary topics: ${TOPICS}. Seed ${i}. Return {items:[...]}.`, { label: `author:speaking:t${b.taskNumber}`, phase: "Author", schema: list(SPEAKING), effort: "high" }).then((r) => r?.items ?? []),
    async (items) => { if (!items.length) return []; const rev = await agent(`${COMMON}\nReview + fix these speaking tasks. Drop unsalvageable. Return {items:[...]}.\n${JSON.stringify(items)}`, { label: "review:speaking", phase: "Review", schema: list(SPEAKING), effort: "high" }); return (rev?.items ?? items).map((it) => ({ ...it, _reviewed: true })); }),
  () => pipeline(vocabTopics, (topic, _o, i) => agent(`${COMMON}\nProduce ~16 ORIGINAL high-value TCF Canada vocabulary entries on "${topic}", CEFR A2–C1 (few A1/C2). Each: term, partOfSpeech, cefrLevel, topic="${topic}", definitionFr, gloss_en, gloss_zh (Simplified Chinese), exampleFr, register. Avoid trivial cognates and avoid the most obvious words (assume common ones already exist). Seed ${i}. Return {items:[...]}.`, { label: `author:vocab:${topic}`, phase: "Author", schema: list(VOCAB), effort: "medium" }).then((r) => r?.items ?? [])),
]);

const wf = writing.filter(Boolean).flat(), sf = speaking.filter(Boolean).flat(), vf = vocab.filter(Boolean).flat();
log(`productive2 — writing ${wf.length}, speaking ${sf.length}, vocab ${vf.length}`);
return { writing: wf, speaking: sf, vocabulary: vf };
