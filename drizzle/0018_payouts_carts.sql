CREATE TABLE IF NOT EXISTS "payout_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"user_id" text NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"updated_at" text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payout_accounts_recipient_uq" ON "payout_accounts" ("recipient_type", "recipient_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"order_ids" jsonb NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reference" text,
	"requested_at" text NOT NULL,
	"processed_at" text,
	"processed_by" text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_requests_recipient_idx" ON "payout_requests" ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_requests_status_idx" ON "payout_requests" ("status");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_carts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"user_name" text,
	"user_phone" text,
	"vendor_id" text,
	"vendor_name" text,
	"items" jsonb NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_carts_updated_idx" ON "customer_carts" ("updated_at");--> statement-breakpoint
ALTER TABLE "payout_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payout_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_carts" ENABLE ROW LEVEL SECURITY;
