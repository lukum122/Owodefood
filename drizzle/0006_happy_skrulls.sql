-- NOTE: The auto-generated version of this migration also included
-- `DROP TABLE "receipt_pickup_orders" CASCADE;` -- Drizzle correctly
-- detected that this table isn't in schema.ts anymore. That's a real,
-- separate, destructive decision that hasn't been explicitly confirmed,
-- so it's deliberately NOT included here. This migration is scoped
-- strictly to backfilling the snapshot/tracking gap from 0003-0005.
--
-- These ADD COLUMN statements are redundant with 0003 (the columns
-- already exist in the live database) -- they're guarded with
-- IF NOT EXISTS so this file is safe even if it's ever actually executed,
-- though in practice it will be marked as already-applied and skipped.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_receipt_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_type" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_image_or_qr" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_note" text;