DROP TABLE IF EXISTS "receipt_pickup_orders" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verified_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rejected_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rejected_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_receipt_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receipt_image_or_qr" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receipt_note" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "license_no" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "plate_no" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "national_id_no" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "verification_doc" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "business_reg_no" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "food_permit_no" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "verification_doc" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "receipt_pickup_enabled" boolean DEFAULT true;