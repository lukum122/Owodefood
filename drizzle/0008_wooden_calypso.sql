ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "batch_date" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "batch_time" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "batch_delivery_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "batch_cutoff_override_minutes" integer;