ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "max_delivery_km" double precision;--> statement-breakpoint
ALTER TABLE "user_saved_addresses" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "user_saved_addresses" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_lat" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_lng" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_distance_km" double precision;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "last_lat" double precision;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "last_lng" double precision;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "last_location_at" text;
