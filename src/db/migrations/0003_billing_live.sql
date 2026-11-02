CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_provider_ref_unique" UNIQUE("provider_ref");