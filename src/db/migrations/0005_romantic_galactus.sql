CREATE TABLE "price_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"variant_id" text NOT NULL,
	"willingness" text NOT NULL,
	"model_preference" text DEFAULT 'no_preference' NOT NULL,
	"price_band" text,
	"reason" text,
	"blocker" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_intent_owner_ck" CHECK (("price_intents"."user_id" is not null) <> ("price_intents"."guest_id" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "price_intent_user_idx" ON "price_intents" USING btree ("user_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_intent_guest_idx" ON "price_intents" USING btree ("guest_id","variant_id");