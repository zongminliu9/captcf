/**
 * Content contract (Zod) shared by: the generation workflow output, the audit CLI,
 * the seed step, and the app. If content doesn't validate here, it never reaches the DB.
 */
import { z } from "zod";
import { CEFR_LEVELS, LISTENING_SUBTYPES, READING_SUBTYPES, TOPICS } from "../exam/config";

export const cefrEnum = z.enum(CEFR_LEVELS as unknown as [string, ...string[]]);
export const topicEnum = z.enum(TOPICS as unknown as [string, ...string[]]);
export const optionIdEnum = z.enum(["a", "b", "c", "d"]);
export type OptionId = z.infer<typeof optionIdEnum>;

export const statusEnum = z.enum(["draft", "in_review", "published", "retired"]);
export const sourceTypeEnum = z.enum(["original"]); // we only ship original material

/** Voice roster keys — decoupled from concrete macOS voices (resolved at audio-gen). */
export const voiceRoleEnum = z.enum([
  "narrator",
  "f1",
  "f2",
  "m1",
  "m2",
  "elder_f",
  "elder_m",
  "youth",
]);
export type VoiceRole = z.infer<typeof voiceRoleEnum>;

export const optionSchema = z.object({
  id: optionIdEnum,
  text: z.string().min(1).max(400),
});

export const inlineVocabSchema = z.object({
  term: z.string().min(1).max(80),
  gloss_en: z.string().min(1).max(200),
  gloss_zh: z.string().min(1).max(120).optional(),
});

const qcmBase = {
  id: z.string().regex(/^[a-z]+_[a-z0-9]+_\d{4}$/, "id must look like listening_b2_0001"),
  slug: z.string().min(3).max(120),
  version: z.number().int().min(1).default(1),
  status: statusEnum.default("published"),
  topic: topicEnum,
  cefrLevel: cefrEnum,
  targetNclc: z.number().int().min(1).max(12),
  stem: z.string().min(3).max(500),
  options: z.array(optionSchema).length(4),
  correctAnswer: optionIdEnum,
  explanation: z.string().min(10).max(1200),
  // keys validated to be exactly the non-correct option ids in refineQcm below
  // (kept as a loose record because z.record(enum,…) in Zod 4 requires ALL enum keys)
  distractorRationales: z.record(z.string(), z.string().min(3).max(600)),
  vocabulary: z.array(inlineVocabSchema).max(12).default([]),
  estimatedSeconds: z.number().int().min(10).max(240),
  difficultyEvidence: z.string().min(5).max(600),
  sourceType: sourceTypeEnum.default("original"),
  author: z.string().min(2).max(80),
  reviewer: z.string().min(2).max(80).nullable().default(null),
  qualityScore: z.number().min(0).max(100).default(0),
};

/** Cross-field checks shared by all QCM items. */
function refineQcm<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((val: any, ctx) => {
    const ids = val.options.map((o: any) => o.id);
    if (new Set(ids).size !== 4) {
      ctx.addIssue({ code: "custom", message: "option ids must be a,b,c,d and unique" });
    }
    if (!ids.includes(val.correctAnswer)) {
      ctx.addIssue({ code: "custom", message: "correctAnswer must reference an existing option" });
    }
    const distractorIds = ids.filter((id: string) => id !== val.correctAnswer).sort();
    const rationaleIds = Object.keys(val.distractorRationales).sort();
    if (JSON.stringify(distractorIds) !== JSON.stringify(rationaleIds)) {
      ctx.addIssue({
        code: "custom",
        message: `distractorRationales must cover exactly the non-correct options (${distractorIds.join(",")})`,
      });
    }
    const texts = val.options.map((o: any) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) {
      ctx.addIssue({ code: "custom", message: "option texts must be distinct" });
    }
  });
}

export const scriptLineSchema = z.object({
  speaker: z.string().min(1).max(60),
  voice: voiceRoleEnum,
  text: z.string().min(1).max(600),
  rate: z.number().int().min(120).max(230).optional(),
});

export const listeningItemSchema = refineQcm(
  z.object({
    ...qcmBase,
    skill: z.literal("listening"),
    subtype: z.enum(LISTENING_SUBTYPES as unknown as [string, ...string[]]),
    audio: z.object({
      context: z.string().min(5).max(300), // French situational intro shown before playback
      lines: z.array(scriptLineSchema).min(1).max(14),
      // filled by the audio pipeline; nullable until generated
      file: z.string().nullable().default(null),
      durationSeconds: z.number().nullable().default(null),
    }),
    transcript: z.string().min(5).max(4000),
  }),
);
export type ListeningItem = z.infer<typeof listeningItemSchema>;

export const readingItemSchema = refineQcm(
  z.object({
    ...qcmBase,
    skill: z.literal("reading"),
    subtype: z.enum(READING_SUBTYPES as unknown as [string, ...string[]]),
    /** Items that share one passage carry the same passageId (exempt from dedupe on stimulus). */
    passageId: z.string().nullable().default(null),
    passage: z.object({
      title: z.string().max(160).nullable().default(null),
      text: z.string().min(20).max(4000),
    }),
  }),
);
export type ReadingItem = z.infer<typeof readingItemSchema>;

const productiveBase = {
  id: z.string().regex(/^[a-z]+_[a-z0-9]+_\d{4}$/),
  slug: z.string().min(3).max(120),
  version: z.number().int().min(1).default(1),
  status: statusEnum.default("published"),
  topic: topicEnum,
  cefrTarget: cefrEnum,
  targetNclc: z.number().int().min(1).max(12),
  promptFr: z.string().min(10).max(1500),
  contextFr: z.string().min(5).max(1200),
  keywords: z.array(z.string().min(1).max(60)).min(2).max(24),
  sourceType: sourceTypeEnum.default("original"),
  author: z.string().min(2).max(80),
  reviewer: z.string().min(2).max(80).nullable().default(null),
  qualityScore: z.number().min(0).max(100).default(0),
};

export const writingTaskSchema = z.object({
  ...productiveBase,
  skill: z.literal("writing"),
  taskNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  minWords: z.number().int().min(20).max(400),
  maxWords: z.number().int().min(40).max(500),
  suggestedMinutes: z.number().int().min(5).max(40),
  modelAnswerFr: z.string().min(40).max(3000),
  rubricNotesFr: z.string().min(10).max(1500),
});
export type WritingTask = z.infer<typeof writingTaskSchema>;

export const speakingTaskSchema = z.object({
  ...productiveBase,
  skill: z.literal("speaking"),
  taskNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  prepSeconds: z.number().int().min(0).max(240),
  speakSeconds: z.number().int().min(60).max(400),
  guidingPointsFr: z.array(z.string().min(3).max(200)).min(2).max(8),
  modelOutlineFr: z.string().min(30).max(2000),
});
export type SpeakingTask = z.infer<typeof speakingTaskSchema>;

export const vocabularyItemSchema = z.object({
  id: z.string().regex(/^vocab_[a-z0-9]+_\d{4}$/),
  term: z.string().min(1).max(80),
  partOfSpeech: z.enum(["nom", "verbe", "adjectif", "adverbe", "expression", "locution"]),
  cefrLevel: cefrEnum,
  topic: topicEnum,
  definitionFr: z.string().min(5).max(400),
  gloss_en: z.string().min(1).max(200),
  gloss_zh: z.string().min(1).max(120),
  exampleFr: z.string().min(5).max(300),
  register: z.enum(["standard", "familier", "soutenu"]).default("standard"),
  sourceType: sourceTypeEnum.default("original"),
  author: z.string().min(2).max(80),
});
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

export const contentBundleSchema = z.object({
  listening: z.array(listeningItemSchema).default([]),
  reading: z.array(readingItemSchema).default([]),
  writing: z.array(writingTaskSchema).default([]),
  speaking: z.array(speakingTaskSchema).default([]),
  vocabulary: z.array(vocabularyItemSchema).default([]),
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;

export type AnyQcmItem = ListeningItem | ReadingItem;
