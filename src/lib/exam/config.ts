/**
 * Versioned TCF Canada exam specification.
 *
 * Every value that can change with an official update lives here (or in the DB
 * `exam_config` table which mirrors this) — never hard-coded in components.
 * Sources are cited in docs/research/OFFICIAL_EXAM_SPEC.md. Bump SPEC_VERSION and
 * record the change when the official structure changes.
 */

export const SPEC_VERSION = "2026.1" as const;

export type SkillId = "listening" | "reading" | "writing" | "speaking";

export const SKILLS: readonly SkillId[] = ["listening", "reading", "writing", "speaking"] as const;

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** QCM skills are auto-scored 0–699; productive skills are rated 0–20. */
export type ScoreKind = "scale699" | "scale20";

export interface SkillSpec {
  id: SkillId;
  /** French label as used on the official exam. */
  labelFr: string;
  labelEn: string;
  code: "CO" | "CE" | "EE" | "EO";
  kind: "qcm" | "productive";
  scoreKind: ScoreKind;
  /** QCM: number of questions. Productive: number of tasks. */
  itemCount: number;
  /** Section time limit in seconds. */
  durationSeconds: number;
  description: string;
}

export const EXAM_SPEC: Record<SkillId, SkillSpec> = {
  listening: {
    id: "listening",
    labelFr: "Compréhension orale",
    labelEn: "Listening comprehension",
    code: "CO",
    kind: "qcm",
    scoreKind: "scale699",
    itemCount: 39,
    durationSeconds: 35 * 60,
    description:
      "39 multiple-choice questions on short recordings of increasing difficulty. Each recording is heard once.",
  },
  reading: {
    id: "reading",
    labelFr: "Compréhension écrite",
    labelEn: "Reading comprehension",
    code: "CE",
    kind: "qcm",
    scoreKind: "scale699",
    itemCount: 39,
    durationSeconds: 60 * 60,
    description: "39 multiple-choice questions on written documents of increasing difficulty.",
  },
  writing: {
    id: "writing",
    labelFr: "Expression écrite",
    labelEn: "Written expression",
    code: "EE",
    kind: "productive",
    scoreKind: "scale20",
    itemCount: 3,
    durationSeconds: 60 * 60,
    description: "3 progressive writing tasks completed in 60 minutes.",
  },
  speaking: {
    id: "speaking",
    labelFr: "Expression orale",
    labelEn: "Spoken expression",
    code: "EO",
    kind: "productive",
    scoreKind: "scale20",
    itemCount: 3,
    durationSeconds: 12 * 60,
    description: "3 tasks in a ~12-minute recorded interview (task 2 includes 2 min preparation).",
  },
};

/** Per-task specs for the productive sections. */
export interface WritingTaskSpec {
  taskNumber: 1 | 2 | 3;
  code: "task1_message" | "task2_article" | "task3_argument";
  titleFr: string;
  minWords: number;
  maxWords: number;
  suggestedMinutes: number;
  description: string;
}

export const WRITING_TASKS: readonly WritingTaskSpec[] = [
  {
    taskNumber: 1,
    code: "task1_message",
    titleFr: "Tâche 1 — Message",
    minWords: 60,
    maxWords: 120,
    suggestedMinutes: 15,
    description:
      "Write a short message (invitation, note, apology, request) to friends or acquaintances.",
  },
  {
    taskNumber: 2,
    code: "task2_article",
    titleFr: "Tâche 2 — Article / court récit",
    minWords: 120,
    maxWords: 150,
    suggestedMinutes: 20,
    description: "Report an event or experience for a blog, newsletter, or forum.",
  },
  {
    taskNumber: 3,
    code: "task3_argument",
    titleFr: "Tâche 3 — Comparaison argumentée",
    minWords: 120,
    maxWords: 180,
    suggestedMinutes: 25,
    description: "Compare two opposing points of view and defend a position.",
  },
] as const;

export interface SpeakingTaskSpec {
  taskNumber: 1 | 2 | 3;
  code: "task1_interview" | "task2_interaction" | "task3_opinion";
  titleFr: string;
  prepSeconds: number;
  speakSeconds: number;
  description: string;
}

export const SPEAKING_TASKS: readonly SpeakingTaskSpec[] = [
  {
    taskNumber: 1,
    code: "task1_interview",
    titleFr: "Tâche 1 — Entretien dirigé",
    prepSeconds: 0,
    speakSeconds: 2 * 60,
    description: "Unprepared guided interview: talk about yourself and your life.",
  },
  {
    taskNumber: 2,
    code: "task2_interaction",
    titleFr: "Tâche 2 — Interaction",
    prepSeconds: 2 * 60,
    speakSeconds: Math.round(5.5 * 60),
    description:
      "Role-play: gather information to accomplish a real-life task (2 min preparation).",
  },
  {
    taskNumber: 3,
    code: "task3_opinion",
    titleFr: "Tâche 3 — Expression d'un point de vue",
    prepSeconds: 0,
    speakSeconds: Math.round(4.5 * 60),
    description: "Express and justify an opinion on a general topic.",
  },
] as const;

/** Question subtypes per QCM skill, ordered roughly by difficulty. */
export const LISTENING_SUBTYPES = [
  "image_match",
  "short_dialogue",
  "announcement",
  "interview_excerpt",
  "argumentation",
] as const;
export type ListeningSubtype = (typeof LISTENING_SUBTYPES)[number];

export const READING_SUBTYPES = [
  "notice",
  "correspondence",
  "informative",
  "argumentative",
  "abstract",
] as const;
export type ReadingSubtype = (typeof READING_SUBTYPES)[number];

export const TOPICS = [
  "vie_quotidienne",
  "travail",
  "etudes",
  "services_publics",
  "immigration",
  "societe",
  "culture",
  "medias",
  "environnement",
  "sante",
  "logement",
  "transport",
  "loisirs",
  "technologie",
] as const;
export type Topic = (typeof TOPICS)[number];

/** Difficulty ordering used by mock assembly to build a progressive section. */
export const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export const TARGET_NCLC_RANGE = { min: 4, max: 10 } as const;
