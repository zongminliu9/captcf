/**
 * Normalize raw workflow output into schema-valid content.
 *
 * Fills mechanical/meta fields the authors didn't produce (ids, slugs, status,
 * transcript, timestamps), coerces topics/options to the allowed shapes, and lets
 * the Zod schemas be the final gate (invalid items are dropped + counted downstream).
 */
import { TOPICS, type Topic } from "@/lib/exam/config";

const OPTION_IDS = ["a", "b", "c", "d"] as const;

const TOPIC_ALIASES: Record<string, Topic> = {
  quotidien: "vie_quotidienne",
  "vie quotidienne": "vie_quotidienne",
  vie_quotidienne: "vie_quotidienne",
  travail: "travail",
  emploi: "travail",
  etudes: "etudes",
  études: "etudes",
  education: "etudes",
  éducation: "etudes",
  services_publics: "services_publics",
  "services publics": "services_publics",
  administration: "services_publics",
  immigration: "immigration",
  societe: "societe",
  société: "societe",
  culture: "culture",
  medias: "medias",
  médias: "medias",
  media: "medias",
  environnement: "environnement",
  ecologie: "environnement",
  sante: "sante",
  santé: "sante",
  logement: "logement",
  transport: "transport",
  transports: "transport",
  loisirs: "loisirs",
  loisir: "loisirs",
  technologie: "technologie",
  techno: "technologie",
};

export function normalizeTopic(raw: string): Topic {
  const key = (raw ?? "").trim().toLowerCase();
  if ((TOPICS as readonly string[]).includes(key)) return key as Topic;
  return TOPIC_ALIASES[key] ?? "societe";
}

const TOPIC_CODE: Record<Topic, string> = {
  vie_quotidienne: "vie",
  travail: "travail",
  etudes: "etudes",
  services_publics: "servpub",
  immigration: "immig",
  societe: "societe",
  culture: "culture",
  medias: "medias",
  environnement: "environ",
  sante: "sante",
  logement: "logement",
  transport: "transport",
  loisirs: "loisirs",
  technologie: "techno",
};

export function topicCode(topic: Topic): string {
  return TOPIC_CODE[topic] ?? "gen";
}

export function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

/** Guarantee options are exactly a,b,c,d with a valid correctAnswer + 3 distractor rationales. */
function normalizeOptions(rawOptions: any[], correctRaw: string, rationalesRaw: Record<string, string>) {
  if (!Array.isArray(rawOptions) || rawOptions.length !== 4) return null;
  const correctIdx = rawOptions.findIndex((o) => o.id === correctRaw);
  if (correctIdx === -1) return null;

  const options = rawOptions.map((o, i) => ({ id: OPTION_IDS[i]!, text: String(o.text ?? "").trim() }));
  const correctAnswer = OPTION_IDS[correctIdx]!;

  // remap rationale keys (old letters → positional letters), keep only non-correct
  const distractorRationales: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    if (i === correctIdx) continue;
    const oldId = rawOptions[i].id;
    const text = rationalesRaw?.[oldId] ?? rationalesRaw?.[OPTION_IDS[i]!];
    if (!text) return null; // missing a required distractor rationale → drop
    distractorRationales[OPTION_IDS[i]!] = String(text).trim();
  }
  return { options, correctAnswer, distractorRationales };
}

const META = {
  version: 1,
  status: "published" as const,
  sourceType: "original" as const,
  author: "CapTCF Author",
};

export function normalizeListening(raw: any, seq: number) {
  const topic = normalizeTopic(raw.topic);
  const cefr = raw.cefrLevel;
  const opt = normalizeOptions(raw.options, raw.correctAnswer, raw.distractorRationales);
  if (!opt) return null;
  const lines = (raw.lines ?? []).map((l: any) => ({
    speaker: String(l.speaker ?? "Voix").slice(0, 60),
    voice: l.voice ?? "narrator",
    text: String(l.text ?? "").trim(),
    ...(l.rate ? { rate: l.rate } : {}),
  }));
  const transcript = lines.map((l: any) => `${l.speaker} : ${l.text}`).join("\n");
  return {
    id: `listening_${String(cefr).toLowerCase()}_${pad4(seq)}`,
    slug: `listening-${String(cefr).toLowerCase()}-${pad4(seq)}`,
    ...META,
    skill: "listening" as const,
    subtype: raw.subtype,
    topic,
    cefrLevel: cefr,
    targetNclc: raw.targetNclc ?? 6,
    stem: String(raw.stem ?? "").trim(),
    ...opt,
    explanation: String(raw.explanation ?? "").trim(),
    vocabulary: (raw.vocabulary ?? []).slice(0, 8),
    estimatedSeconds: raw.estimatedSeconds ?? 45,
    difficultyEvidence: String(raw.difficultyEvidence ?? "").trim(),
    reviewer: raw._qa?.reviewer ?? "CapTCF Review",
    qualityScore: raw._qa?.quality ?? 80,
    audio: { context: String(raw.context ?? "").trim(), lines, file: null, durationSeconds: null },
    transcript,
  };
}

export function normalizeReading(raw: any, seq: number) {
  const topic = normalizeTopic(raw.topic);
  const cefr = raw.cefrLevel;
  const opt = normalizeOptions(raw.options, raw.correctAnswer, raw.distractorRationales);
  if (!opt) return null;
  return {
    id: `reading_${String(cefr).toLowerCase()}_${pad4(seq)}`,
    slug: `reading-${String(cefr).toLowerCase()}-${pad4(seq)}`,
    ...META,
    skill: "reading" as const,
    subtype: raw.subtype,
    topic,
    cefrLevel: cefr,
    targetNclc: raw.targetNclc ?? 6,
    stem: String(raw.stem ?? "").trim(),
    ...opt,
    explanation: String(raw.explanation ?? "").trim(),
    vocabulary: (raw.vocabulary ?? []).slice(0, 8),
    estimatedSeconds: raw.estimatedSeconds ?? 60,
    difficultyEvidence: String(raw.difficultyEvidence ?? "").trim(),
    reviewer: raw._qa?.reviewer ?? "CapTCF Review",
    qualityScore: raw._qa?.quality ?? 80,
    passageId: null,
    passage: {
      title: raw.passageTitle ? String(raw.passageTitle).trim().slice(0, 160) : null,
      text: String(raw.passageText ?? "").trim(),
    },
  };
}

export function normalizeWriting(raw: any, seq: number) {
  const topic = normalizeTopic(raw.topic);
  return {
    id: `writing_t${raw.taskNumber}_${pad4(seq)}`,
    slug: `writing-t${raw.taskNumber}-${pad4(seq)}`,
    ...META,
    skill: "writing" as const,
    taskNumber: raw.taskNumber,
    topic,
    cefrTarget: raw.cefrTarget,
    targetNclc: raw.targetNclc ?? 6,
    promptFr: String(raw.promptFr ?? "").trim(),
    contextFr: String(raw.contextFr ?? "").trim(),
    keywords: (raw.keywords ?? []).map((k: string) => String(k).trim()).slice(0, 24),
    minWords: raw.minWords,
    maxWords: raw.maxWords,
    suggestedMinutes: raw.suggestedMinutes ?? 20,
    modelAnswerFr: String(raw.modelAnswerFr ?? "").trim(),
    rubricNotesFr: String(raw.rubricNotesFr ?? "").trim(),
    reviewer: raw._reviewed ? "CapTCF Review" : null,
    qualityScore: raw._reviewed ? 84 : 70,
  };
}

export function normalizeSpeaking(raw: any, seq: number) {
  const topic = normalizeTopic(raw.topic);
  return {
    id: `speaking_t${raw.taskNumber}_${pad4(seq)}`,
    slug: `speaking-t${raw.taskNumber}-${pad4(seq)}`,
    ...META,
    skill: "speaking" as const,
    taskNumber: raw.taskNumber,
    topic,
    cefrTarget: raw.cefrTarget,
    targetNclc: raw.targetNclc ?? 6,
    promptFr: String(raw.promptFr ?? "").trim(),
    contextFr: String(raw.contextFr ?? "").trim(),
    keywords: (raw.keywords ?? []).map((k: string) => String(k).trim()).slice(0, 24),
    prepSeconds: raw.prepSeconds ?? 0,
    speakSeconds: raw.speakSeconds ?? 120,
    guidingPointsFr: (raw.guidingPointsFr ?? []).map((k: string) => String(k).trim()).slice(0, 8),
    modelOutlineFr: String(raw.modelOutlineFr ?? "").trim(),
    reviewer: raw._reviewed ? "CapTCF Review" : null,
    qualityScore: raw._reviewed ? 84 : 70,
  };
}

export function normalizeVocab(raw: any, seq: number) {
  const topic = normalizeTopic(raw.topic);
  return {
    id: `vocab_${topicCode(topic)}_${pad4(seq)}`,
    term: String(raw.term ?? "").trim(),
    partOfSpeech: raw.partOfSpeech,
    cefrLevel: raw.cefrLevel,
    topic,
    definitionFr: String(raw.definitionFr ?? "").trim(),
    gloss_en: String(raw.gloss_en ?? "").trim(),
    gloss_zh: String(raw.gloss_zh ?? "").trim(),
    exampleFr: String(raw.exampleFr ?? "").trim(),
    register: raw.register ?? "standard",
    sourceType: "original" as const,
    author: "CapTCF Author",
  };
}
