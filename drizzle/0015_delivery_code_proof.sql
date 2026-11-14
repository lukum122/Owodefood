CREATE TABLE IF NOT EXISTS "delivery_codes" (
	"order_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_proof_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_confirmed_by" text;
