ALTER TABLE "audio_assets" ADD COLUMN "source_type" text DEFAULT 'prototype_tts' NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "publish_state" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "license_name" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "license_url" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "speaker_id" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "speaker_display_name" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "speaker_region" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "recording_session" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "master_file" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "delivery_file" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "transcript_hash" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "qa_status" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "qa_reviewer" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "qa_notes" text;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "loudness_lufs" numeric;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "true_peak_db" numeric;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "published_at" timestamp with time zone;