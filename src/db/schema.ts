/**
 * CapTCF database schema (Drizzle / PostgreSQL).
 *
 * Ownership model: user-owned rows carry `userId`; anonymous rows carry `guestId`.
 * A CHECK enforces exactly one of the two, and guest→account merge simply flips
 * `guestId → userId` (see lib/auth/merge). Unique constraints are duplicated per owner
 * so merge stays idempotent.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ── enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const skillEnum = pgEnum("skill", ["listening", "reading", "writing", "speaking"]);
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "published",
  "retired",
]);
export const sessionModeEnum = pgEnum("session_mode", [
  "quick",
  "custom",
  "diagnostic",
  "review",
  "mistakes",
  "bookmarks",
  "listening",
  "reading",
  "mock",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "created",
  "in_progress",
  "paused",
  "submitted",
  "graded",
  "reviewed",
  "abandoned",
  "expired",
]);
export const submissionStatusEnum = pgEnum("submission_status", ["draft", "submitted", "graded"]);
export const feedbackSourceEnum = pgEnum("feedback_source", ["local", "ai"]);
export const planEnum = pgEnum("plan", ["free", "premium"]);
export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const owner = {
  userId: uuid("user_id"),
  guestId: uuid("guest_id"),
};

// ── identity ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: roleEnum("role").notNull().default("user"),
  locale: text("locale").notNull().default("fr"),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  mergedUserId: uuid("merged_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("accounts_provider_idx").on(t.provider, t.providerAccountId)],
);

// ── learner profile & goals ──────────────────────────────────────────────────
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    currentLevel: text("current_level"), // CEFR self-assessment
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("profiles_user_idx").on(t.userId),
    uniqueIndex("profiles_guest_idx").on(t.guestId),
    check("profiles_owner_ck", sql`(${t.userId} is not null) <> (${t.guestId} is not null)`),
  ],
);

export const examGoals = pgTable(
  "exam_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    targetNclc: integer("target_nclc").notNull().default(7),
    examDate: date("exam_date"),
    weeklyDays: integer("weekly_days").notNull().default(4),
    dailyMinutes: integer("daily_minutes").notNull().default(20),
    priorAttempt: boolean("prior_attempt").notNull().default(false),
    focusSkills: jsonb("focus_skills").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("exam_goals_user_idx").on(t.userId),
    uniqueIndex("exam_goals_guest_idx").on(t.guestId),
    check("exam_goals_owner_ck", sql`(${t.userId} is not null) <> (${t.guestId} is not null)`),
  ],
);

export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    weekStart: date("week_start").notNull(),
    plan: jsonb("plan").$type<unknown>().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("study_plans_user_idx").on(t.userId),
    index("study_plans_guest_idx").on(t.guestId),
    check("study_plans_owner_ck", sql`(${t.userId} is not null) <> (${t.guestId} is not null)`),
  ],
);

// ── content: question bank ───────────────────────────────────────────────────
export const audioAssets = pgTable("audio_assets", {
  id: text("id").primaryKey(), // == question id
  file: text("file").notNull(), // e.g. /audio/listening_b2_0001.m4a
  durationSeconds: numeric("duration_seconds").notNull(),
  textHash: text("text_hash").notNull(),
  voices: jsonb("voices").$type<unknown>().notNull(),
  status: text("status").notNull().default("generated"),
  // QA tier: prototype_tts | reviewed_tts | premium_ready | rejected
  quality: text("quality").notNull().default("prototype_tts"),
  qa: jsonb("qa").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    version: integer("version").notNull().default(1),
    status: contentStatusEnum("status").notNull().default("published"),
    skill: skillEnum("skill").notNull(),
    subtype: text("subtype").notNull(),
    topic: text("topic").notNull(),
    cefrLevel: text("cefr_level").notNull(),
    targetNclc: integer("target_nclc").notNull(),
    stem: text("stem").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation").notNull(),
    distractorRationales: jsonb("distractor_rationales").$type<Record<string, string>>().notNull(),
    stimulus: jsonb("stimulus").$type<unknown>().notNull(),
    vocabulary: jsonb("vocabulary").$type<unknown>().notNull().default([]),
    estimatedSeconds: integer("estimated_seconds").notNull(),
    difficultyEvidence: text("difficulty_evidence").notNull(),
    qualityScore: integer("quality_score").notNull().default(0),
    author: text("author").notNull(),
    reviewer: text("reviewer"),
    sourceType: text("source_type").notNull().default("original"),
    passageId: text("passage_id"),
    audioId: text("audio_id").references(() => audioAssets.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("questions_skill_idx").on(t.skill),
    index("questions_skill_cefr_idx").on(t.skill, t.cefrLevel),
    index("questions_subtype_idx").on(t.subtype),
    index("questions_status_idx").on(t.status),
    index("questions_passage_idx").on(t.passageId),
  ],
);

export const options = pgTable(
  "options",
  {
    id: serial("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull(), // 'a'..'d'
    text: text("text").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (t) => [uniqueIndex("options_q_opt_idx").on(t.questionId, t.optionId)],
);

export const questionVersions = pgTable("question_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<unknown>().notNull(),
  editorUserId: uuid("editor_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── content: productive tasks + vocabulary ───────────────────────────────────
export const writingTasks = pgTable("writing_tasks", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  version: integer("version").notNull().default(1),
  status: contentStatusEnum("status").notNull().default("published"),
  taskNumber: integer("task_number").notNull(),
  topic: text("topic").notNull(),
  cefrTarget: text("cefr_target").notNull(),
  targetNclc: integer("target_nclc").notNull(),
  promptFr: text("prompt_fr").notNull(),
  contextFr: text("context_fr").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull(),
  minWords: integer("min_words").notNull(),
  maxWords: integer("max_words").notNull(),
  suggestedMinutes: integer("suggested_minutes").notNull(),
  modelAnswerFr: text("model_answer_fr").notNull(),
  rubricNotesFr: text("rubric_notes_fr").notNull(),
  author: text("author").notNull(),
  reviewer: text("reviewer"),
  qualityScore: integer("quality_score").notNull().default(0),
  ...timestamps,
});

export const speakingTasks = pgTable("speaking_tasks", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  version: integer("version").notNull().default(1),
  status: contentStatusEnum("status").notNull().default("published"),
  taskNumber: integer("task_number").notNull(),
  topic: text("topic").notNull(),
  cefrTarget: text("cefr_target").notNull(),
  targetNclc: integer("target_nclc").notNull(),
  promptFr: text("prompt_fr").notNull(),
  contextFr: text("context_fr").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull(),
  prepSeconds: integer("prep_seconds").notNull(),
  speakSeconds: integer("speak_seconds").notNull(),
  guidingPointsFr: jsonb("guiding_points_fr").$type<string[]>().notNull(),
  modelOutlineFr: text("model_outline_fr").notNull(),
  author: text("author").notNull(),
  reviewer: text("reviewer"),
  qualityScore: integer("quality_score").notNull().default(0),
  ...timestamps,
});

export const vocabularyItems = pgTable(
  "vocabulary_items",
  {
    id: text("id").primaryKey(),
    term: text("term").notNull(),
    partOfSpeech: text("part_of_speech").notNull(),
    cefrLevel: text("cefr_level").notNull(),
    topic: text("topic").notNull(),
    definitionFr: text("definition_fr").notNull(),
    glossEn: text("gloss_en").notNull(),
    glossZh: text("gloss_zh").notNull(),
    exampleFr: text("example_fr").notNull(),
    register: text("register").notNull().default("standard"),
    author: text("author").notNull(),
    ...timestamps,
  },
  (t) => [index("vocab_topic_idx").on(t.topic), index("vocab_cefr_idx").on(t.cefrLevel)],
);

// ── content: mock exams ──────────────────────────────────────────────────────
export const mockTests = pgTable("mock_tests", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  version: integer("version").notNull().default(1),
  status: contentStatusEnum("status").notNull().default("published"),
  formNumber: integer("form_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  specVersion: text("spec_version").notNull(),
  isSample: boolean("is_sample").notNull().default(false),
  ...timestamps,
});

export const mockSections = pgTable(
  "mock_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mockTestId: text("mock_test_id")
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    skill: skillEnum("skill").notNull(),
    orderIndex: integer("order_index").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
  },
  (t) => [uniqueIndex("mock_sections_idx").on(t.mockTestId, t.skill)],
);

export const mockItems = pgTable(
  "mock_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mockSectionId: uuid("mock_section_id")
      .notNull()
      .references(() => mockSections.id, { onDelete: "cascade" }),
    refType: text("ref_type").notNull(), // 'question' | 'writing_task' | 'speaking_task'
    refId: text("ref_id").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (t) => [
    index("mock_items_section_idx").on(t.mockSectionId),
    uniqueIndex("mock_items_pos_idx").on(t.mockSectionId, t.orderIndex),
  ],
);

// ── practice sessions & responses ────────────────────────────────────────────
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    mode: sessionModeEnum("mode").notNull(),
    status: sessionStatusEnum("status").notNull().default("created"),
    skill: skillEnum("skill"),
    config: jsonb("config").$type<unknown>().notNull().default({}),
    itemOrder: jsonb("item_order").$type<{ refType: string; refId: string }[]>().notNull(),
    timed: boolean("timed").notNull().default(false),
    instantFeedback: boolean("instant_feedback").notNull().default(true),
    durationSeconds: integer("duration_seconds"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    pausedMs: integer("paused_ms").notNull().default(0),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    mockTestId: text("mock_test_id").references(() => mockTests.id),
    currentSectionIndex: integer("current_section_index").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_guest_idx").on(t.guestId),
    index("sessions_status_idx").on(t.status),
    check("sessions_owner_ck", sql`(${t.userId} is not null) <> (${t.guestId} is not null)`),
  ],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" }),
    ...owner,
    refType: text("ref_type").notNull(),
    refId: text("ref_id").notNull(),
    skill: skillEnum("skill").notNull(),
    cefrLevel: text("cefr_level").notNull(),
    selectedAnswer: text("selected_answer"),
    correct: boolean("correct"),
    responseMs: integer("response_ms"),
    hintUsed: boolean("hint_used").notNull().default(false),
    flagged: boolean("flagged").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("responses_session_ref_idx").on(t.sessionId, t.refId),
    index("responses_user_idx").on(t.userId),
    index("responses_guest_idx").on(t.guestId),
    index("responses_correct_idx").on(t.correct),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" })
      .unique(),
    ...owner,
    mode: sessionModeEnum("mode").notNull(),
    skill: skillEnum("skill"),
    mockTestId: text("mock_test_id").references(() => mockTests.id),
    totalItems: integer("total_items").notNull(),
    correctItems: integer("correct_items").notNull(),
    perSkill: jsonb("per_skill").$type<unknown>().notNull(),
    estimate: jsonb("estimate").$type<unknown>().notNull(),
    durationSeconds: integer("duration_seconds"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_user_idx").on(t.userId), index("attempts_guest_idx").on(t.guestId)],
);

// ── learning state ───────────────────────────────────────────────────────────
export const masteryRecords = pgTable(
  "mastery_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    skill: skillEnum("skill").notNull(),
    subtype: text("subtype").notNull().default("_all"),
    state: jsonb("state").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mastery_user_idx").on(t.userId, t.skill, t.subtype),
    uniqueIndex("mastery_guest_idx").on(t.guestId, t.skill, t.subtype),
  ],
);

export const reviewQueue = pgTable(
  "review_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sm2: jsonb("sm2").$type<unknown>().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    source: text("source").notNull().default("mistake"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("review_user_idx").on(t.userId, t.questionId),
    uniqueIndex("review_guest_idx").on(t.guestId, t.questionId),
    index("review_due_idx").on(t.dueAt),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_idx").on(t.userId, t.questionId),
    uniqueIndex("bookmarks_guest_idx").on(t.guestId, t.questionId),
  ],
);

export const mistakes = pgTable(
  "mistakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    wrongCount: integer("wrong_count").notNull().default(1),
    resolved: boolean("resolved").notNull().default(false),
    lastWrongAt: timestamp("last_wrong_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mistakes_user_idx").on(t.userId, t.questionId),
    uniqueIndex("mistakes_guest_idx").on(t.guestId, t.questionId),
  ],
);

export const vocabularyProgress = pgTable(
  "vocabulary_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    vocabId: text("vocab_id")
      .notNull()
      .references(() => vocabularyItems.id, { onDelete: "cascade" }),
    sm2: jsonb("sm2").$type<unknown>().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("learning"),
  },
  (t) => [
    uniqueIndex("vocab_prog_user_idx").on(t.userId, t.vocabId),
    uniqueIndex("vocab_prog_guest_idx").on(t.guestId, t.vocabId),
  ],
);

// ── productive submissions ───────────────────────────────────────────────────
export const writingSubmissions = pgTable(
  "writing_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    taskId: text("task_id")
      .notNull()
      .references(() => writingTasks.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => practiceSessions.id, { onDelete: "set null" }),
    text: text("text").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    status: submissionStatusEnum("status").notNull().default("draft"),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("writing_sub_user_idx").on(t.userId), index("writing_sub_guest_idx").on(t.guestId)],
);

export const writingFeedback = pgTable("writing_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => writingSubmissions.id, { onDelete: "cascade" }),
  source: feedbackSourceEnum("source").notNull(),
  rubric: jsonb("rubric").$type<unknown>().notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const speakingSubmissions = pgTable(
  "speaking_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    taskId: text("task_id")
      .notNull()
      .references(() => speakingTasks.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => practiceSessions.id, { onDelete: "set null" }),
    audioFile: text("audio_file"),
    durationSeconds: numeric("duration_seconds"),
    status: submissionStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("speaking_sub_user_idx").on(t.userId),
    index("speaking_sub_guest_idx").on(t.guestId),
  ],
);

export const speakingFeedback = pgTable("speaking_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => speakingSubmissions.id, { onDelete: "cascade" }),
  source: feedbackSourceEnum("source").notNull(),
  rubric: jsonb("rubric").$type<unknown>().notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── billing & entitlements ───────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  plan: planEnum("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  provider: text("provider").notNull().default("simulator"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  ...timestamps,
});

export const entitlements = pgTable("entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  source: text("source").notNull().default("simulator"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const usageCounters = pgTable(
  "usage_counters",
  {
    ...owner,
    day: date("day").notNull(),
    kind: text("kind").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.guestId, t.day, t.kind] }),
    index("usage_day_idx").on(t.day),
  ],
);

// ── ops: reports, analytics, audits ──────────────────────────────────────────
export const issueReports = pgTable("issue_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...owner,
  refType: text("ref_type").notNull(),
  refId: text("ref_id").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...owner,
    type: text("type").notNull(),
    props: jsonb("props").$type<unknown>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_type_idx").on(t.type)],
);

export const rateLimits = pgTable("rate_limits", {
  bucket: text("bucket").primaryKey(), // "<key>:<windowStart>"
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const contentAudits = pgTable("content_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  passed: boolean("passed").notNull(),
  summary: jsonb("summary").$type<unknown>().notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type WritingTask = typeof writingTasks.$inferSelect;
export type SpeakingTask = typeof speakingTasks.$inferSelect;
