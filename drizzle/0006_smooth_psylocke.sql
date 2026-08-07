-- Drops the receipt_pickup_orders table. Confirmed dead: verified zero
-- references anywhere in server.ts (no queries, no writes, ever), and the
-- matching frontend code (a separate, disconnected implementation from
-- the real, working receipt-pickup order flow, which lives on the orders
-- table with orderType='receipt_pickup') has been removed in the same
-- change. This was legacy from an earlier, abandoned approach.
DROP TABLE "receipt_pickup_orders" CASCADE;--> statement-breakpoint

-- These ADD COLUMN statements are redundant with migration 0003 (the
-- columns already exist in the live database) -- guarded with
-- IF NOT EXISTS so this file is safe regardless.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_receipt_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_type" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_image_or_qr" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_note" text;