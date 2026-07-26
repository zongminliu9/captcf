ALTER TABLE "mistakes" ADD COLUMN "first_wrong_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "correct_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "correct_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "last_wrong_answer" text;--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "added_reason" text DEFAULT 'wrong' NOT NULL;