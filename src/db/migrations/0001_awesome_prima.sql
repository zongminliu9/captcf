ALTER TABLE "audio_assets" ADD COLUMN "quality" text DEFAULT 'prototype_tts' NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD COLUMN "qa" jsonb;