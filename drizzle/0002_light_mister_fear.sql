CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"details" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"amount" integer NOT NULL,
	"released_by" text NOT NULL,
	"released_at" text NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text,
	"notes" text,
	"status" text DEFAULT 'released' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rider_payout_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "vendor_payout_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_pickup_orders" ADD COLUMN IF NOT EXISTS "delivery_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "operating_hours" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "is_temporarily_closed" boolean DEFAULT false;