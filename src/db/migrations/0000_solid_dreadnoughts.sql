CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."feedback_source" AS ENUM('local', 'ai');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('quick', 'custom', 'diagnostic', 'review', 'mistakes', 'bookmarks', 'listening', 'reading', 'mock');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('created', 'in_progress', 'paused', 'submitted', 'graded', 'reviewed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."skill" AS ENUM('listening', 'reading', 'writing', 'speaking');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted', 'graded');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"type" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"mode" "session_mode" NOT NULL,
	"skill" "skill",
	"mock_test_id" text,
	"total_items" integer NOT NULL,
	"correct_items" integer NOT NULL,
	"per_skill" jsonb NOT NULL,
	"estimate" jsonb NOT NULL,
	"duration_seconds" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"file" text NOT NULL,
	"duration_seconds" numeric NOT NULL,
	"text_hash" text NOT NULL,
	"voices" jsonb NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"question_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passed" boolean NOT NULL,
	"summary" jsonb NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" NOT NULL,
	"source" text DEFAULT 'simulator' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exam_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"target_nclc" integer DEFAULT 7 NOT NULL,
	"exam_date" date,
	"weekly_days" integer DEFAULT 4 NOT NULL,
	"daily_minutes" integer DEFAULT 20 NOT NULL,
	"prior_attempt" boolean DEFAULT false NOT NULL,
	"focus_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_goals_owner_ck" CHECK (("exam_goals"."user_id" is not null) <> ("exam_goals"."guest_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"merged_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "issue_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mastery_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"skill" "skill" NOT NULL,
	"subtype" text DEFAULT '_all' NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"question_id" text NOT NULL,
	"wrong_count" integer DEFAULT 1 NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"last_wrong_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_section_id" uuid NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_test_id" text NOT NULL,
	"skill" "skill" NOT NULL,
	"order_index" integer NOT NULL,
	"duration_seconds" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"form_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"spec_version" text NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_tests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"option_id" text NOT NULL,
	"text" text NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"mode" "session_mode" NOT NULL,
	"status" "session_status" DEFAULT 'created' NOT NULL,
	"skill" "skill",
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_order" jsonb NOT NULL,
	"timed" boolean DEFAULT false NOT NULL,
	"instant_feedback" boolean DEFAULT true NOT NULL,
	"duration_seconds" integer,
	"started_at" timestamp with time zone,
	"paused_ms" integer DEFAULT 0 NOT NULL,
	"paused_at" timestamp with time zone,
	"mock_test_id" text,
	"current_section_index" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_owner_ck" CHECK (("practice_sessions"."user_id" is not null) <> ("practice_sessions"."guest_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"current_level" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_owner_ck" CHECK (("profiles"."user_id" is not null) <> ("profiles"."guest_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"editor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"skill" "skill" NOT NULL,
	"subtype" text NOT NULL,
	"topic" text NOT NULL,
	"cefr_level" text NOT NULL,
	"target_nclc" integer NOT NULL,
	"stem" text NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"distractor_rationales" jsonb NOT NULL,
	"stimulus" jsonb NOT NULL,
	"vocabulary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_seconds" integer NOT NULL,
	"difficulty_evidence" text NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"author" text NOT NULL,
	"reviewer" text,
	"source_type" text DEFAULT 'original' NOT NULL,
	"passage_id" text,
	"audio_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"skill" "skill" NOT NULL,
	"cefr_level" text NOT NULL,
	"selected_answer" text,
	"correct" boolean,
	"response_ms" integer,
	"hint_used" boolean DEFAULT false NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"question_id" text NOT NULL,
	"sm2" jsonb NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"source" text DEFAULT 'mistake' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"source" "feedback_source" NOT NULL,
	"rubric" jsonb NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"task_id" text NOT NULL,
	"session_id" uuid,
	"audio_file" text,
	"duration_seconds" numeric,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"task_number" integer NOT NULL,
	"topic" text NOT NULL,
	"cefr_target" text NOT NULL,
	"target_nclc" integer NOT NULL,
	"prompt_fr" text NOT NULL,
	"context_fr" text NOT NULL,
	"keywords" jsonb NOT NULL,
	"prep_seconds" integer NOT NULL,
	"speak_seconds" integer NOT NULL,
	"guiding_points_fr" jsonb NOT NULL,
	"model_outline_fr" text NOT NULL,
	"author" text NOT NULL,
	"reviewer" text,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speaking_tasks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"week_start" date NOT NULL,
	"plan" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plans_owner_ck" CHECK (("study_plans"."user_id" is not null) <> ("study_plans"."guest_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provider" text DEFAULT 'simulator' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"user_id" uuid,
	"guest_id" uuid,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_user_id_guest_id_day_kind_pk" PRIMARY KEY("user_id","guest_id","day","kind")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vocabulary_items" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"part_of_speech" text NOT NULL,
	"cefr_level" text NOT NULL,
	"topic" text NOT NULL,
	"definition_fr" text NOT NULL,
	"gloss_en" text NOT NULL,
	"gloss_zh" text NOT NULL,
	"example_fr" text NOT NULL,
	"register" text DEFAULT 'standard' NOT NULL,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"vocab_id" text NOT NULL,
	"sm2" jsonb NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'learning' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"source" "feedback_source" NOT NULL,
	"rubric" jsonb NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"task_id" text NOT NULL,
	"session_id" uuid,
	"text" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"task_number" integer NOT NULL,
	"topic" text NOT NULL,
	"cefr_target" text NOT NULL,
	"target_nclc" integer NOT NULL,
	"prompt_fr" text NOT NULL,
	"context_fr" text NOT NULL,
	"keywords" jsonb NOT NULL,
	"min_words" integer NOT NULL,
	"max_words" integer NOT NULL,
	"suggested_minutes" integer NOT NULL,
	"model_answer_fr" text NOT NULL,
	"rubric_notes_fr" text NOT NULL,
	"author" text NOT NULL,
	"reviewer" text,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_tasks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_merged_user_id_users_id_fk" FOREIGN KEY ("merged_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_items" ADD CONSTRAINT "mock_items_mock_section_id_mock_sections_id_fk" FOREIGN KEY ("mock_section_id") REFERENCES "public"."mock_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_sections" ADD CONSTRAINT "mock_sections_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_editor_user_id_users_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_audio_id_audio_assets_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."audio_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_feedback" ADD CONSTRAINT "speaking_feedback_submission_id_speaking_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."speaking_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_task_id_speaking_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."speaking_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_vocab_id_vocabulary_items_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_feedback" ADD CONSTRAINT "writing_feedback_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_task_id_writing_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."writing_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "analytics_type_idx" ON "analytics_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempts_guest_idx" ON "attempts" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_idx" ON "bookmarks" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_guest_idx" ON "bookmarks" USING btree ("guest_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_goals_user_idx" ON "exam_goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_goals_guest_idx" ON "exam_goals" USING btree ("guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_user_idx" ON "mastery_records" USING btree ("user_id","skill","subtype");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_guest_idx" ON "mastery_records" USING btree ("guest_id","skill","subtype");--> statement-breakpoint
CREATE UNIQUE INDEX "mistakes_user_idx" ON "mistakes" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mistakes_guest_idx" ON "mistakes" USING btree ("guest_id","question_id");--> statement-breakpoint
CREATE INDEX "mock_items_section_idx" ON "mock_items" USING btree ("mock_section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_items_pos_idx" ON "mock_items" USING btree ("mock_section_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_sections_idx" ON "mock_sections" USING btree ("mock_test_id","skill");--> statement-breakpoint
CREATE UNIQUE INDEX "options_q_opt_idx" ON "options" USING btree ("question_id","option_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_guest_idx" ON "practice_sessions" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "practice_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_guest_idx" ON "profiles" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "questions_skill_idx" ON "questions" USING btree ("skill");--> statement-breakpoint
CREATE INDEX "questions_skill_cefr_idx" ON "questions" USING btree ("skill","cefr_level");--> statement-breakpoint
CREATE INDEX "questions_subtype_idx" ON "questions" USING btree ("subtype");--> statement-breakpoint
CREATE INDEX "questions_status_idx" ON "questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_passage_idx" ON "questions" USING btree ("passage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_session_ref_idx" ON "responses" USING btree ("session_id","ref_id");--> statement-breakpoint
CREATE INDEX "responses_user_idx" ON "responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "responses_guest_idx" ON "responses" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "responses_correct_idx" ON "responses" USING btree ("correct");--> statement-breakpoint
CREATE UNIQUE INDEX "review_user_idx" ON "review_queue" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_guest_idx" ON "review_queue" USING btree ("guest_id","question_id");--> statement-breakpoint
CREATE INDEX "review_due_idx" ON "review_queue" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "speaking_sub_user_idx" ON "speaking_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "speaking_sub_guest_idx" ON "speaking_submissions" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "study_plans_user_idx" ON "study_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_plans_guest_idx" ON "study_plans" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "usage_day_idx" ON "usage_counters" USING btree ("day");--> statement-breakpoint
CREATE INDEX "vocab_topic_idx" ON "vocabulary_items" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "vocab_cefr_idx" ON "vocabulary_items" USING btree ("cefr_level");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_prog_user_idx" ON "vocabulary_progress" USING btree ("user_id","vocab_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_prog_guest_idx" ON "vocabulary_progress" USING btree ("guest_id","vocab_id");--> statement-breakpoint
CREATE INDEX "writing_sub_user_idx" ON "writing_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "writing_sub_guest_idx" ON "writing_submissions" USING btree ("guest_id");