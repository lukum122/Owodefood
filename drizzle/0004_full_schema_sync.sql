-- Comprehensive schema sync: safe to run any number of times.
-- CREATE TABLE IF NOT EXISTS won't touch tables that already exist.
-- ADD COLUMN IF NOT EXISTS won't touch columns that already exist.
-- This exists because production drifted out of sync with the migration
-- history (several columns were referenced in code but never actually
-- added to the real database) -- this brings it fully back in line in
-- one pass instead of discovering gaps one broken feature at a time.

-- USERS
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "role" text NOT NULL,
  "gender" text,
  "created_at" text NOT NULL,
  "pin" text,
  "roles" jsonb
);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roles" jsonb;

-- VENDORS
CREATE TABLE IF NOT EXISTS "vendors" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id"),
  "name" text NOT NULL,
  "description" text NOT NULL,
  "cuisine" text NOT NULL,
  "image" text NOT NULL,
  "rating" double precision NOT NULL DEFAULT 5.0,
  "address" text NOT NULL,
  "status" text NOT NULL,
  "created_at" text NOT NULL,
  "opening_time" text,
  "closing_time" text,
  "opening_days" jsonb,
  "operating_hours" jsonb,
  "is_temporarily_closed" boolean DEFAULT false,
  "cover_image" text,
  "category" text,
  "prep_time" integer,
  "delivery_fee" integer,
  "service_fee" integer,
  "service_fee_type" text,
  "service_fee_value" integer,
  "commission_type" text,
  "commission_value" integer,
  "free_delivery" boolean DEFAULT false
);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "opening_time" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "closing_time" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "opening_days" jsonb;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "operating_hours" jsonb;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "is_temporarily_closed" boolean DEFAULT false;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "cover_image" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "prep_time" integer;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "delivery_fee" integer;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "service_fee" integer;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "service_fee_type" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "service_fee_value" integer;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "commission_type" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "commission_value" integer;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "free_delivery" boolean DEFAULT false;

-- PRODUCTS
CREATE TABLE IF NOT EXISTS "products" (
  "id" text PRIMARY KEY NOT NULL,
  "vendor_id" text NOT NULL REFERENCES "vendors"("id"),
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price" integer NOT NULL,
  "image" text NOT NULL,
  "category" text NOT NULL,
  "is_available" boolean NOT NULL DEFAULT true,
  "created_at" text NOT NULL,
  "addons" jsonb,
  "max_addons" integer,
  "addon_groups" jsonb
);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "addons" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "max_addons" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "addon_groups" jsonb;

-- ORDERS
CREATE TABLE IF NOT EXISTS "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL REFERENCES "users"("id"),
  "customer_name" text NOT NULL,
  "customer_phone" text NOT NULL,
  "vendor_id" text NOT NULL REFERENCES "vendors"("id"),
  "vendor_name" text NOT NULL,
  "rider_id" text,
  "rider_name" text,
  "status" text NOT NULL,
  "total_amount" integer NOT NULL,
  "delivery_address" text NOT NULL,
  "payment_method" text NOT NULL,
  "created_at" text NOT NULL,
  "service_fee" integer,
  "delivery_fee" integer,
  "tax" integer,
  "rider_payout_status" text NOT NULL DEFAULT 'pending',
  "vendor_payout_status" text NOT NULL DEFAULT 'pending',
  "verified_by" text,
  "verified_at" text,
  "rejected_by" text,
  "rejected_at" text,
  "rejection_reason" text,
  "payment_receipt_url" text,
  "order_type" text DEFAULT 'standard',
  "receipt_image_or_qr" text,
  "receipt_note" text
);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rider_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rider_name" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_fee" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_fee" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rider_payout_status" text DEFAULT 'pending';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "vendor_payout_status" text DEFAULT 'pending';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_by" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "verified_at" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_by" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected_at" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_receipt_url" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_type" text DEFAULT 'standard';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_image_or_qr" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_note" text;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "product_id" text NOT NULL,
  "name" text NOT NULL,
  "price" integer NOT NULL,
  "quantity" integer NOT NULL
);

-- RIDERS
CREATE TABLE IF NOT EXISTS "riders" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id"),
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "status" text NOT NULL,
  "is_available" boolean NOT NULL DEFAULT true,
  "created_at" text NOT NULL
);

-- ADDRESSES
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "address" text NOT NULL
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS "categories" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "icon" text NOT NULL
);

-- PAYMENT GATEWAYS
CREATE TABLE IF NOT EXISTS "payment_gateways" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "desc" text NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "api_key" text,
  "secret_key" text,
  "contract_code" text,
  "bank_name" text,
  "account_number" text,
  "account_name" text,
  "is_active" boolean DEFAULT false
);
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "api_key" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "secret_key" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "contract_code" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "bank_name" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "account_number" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "account_name" text;
ALTER TABLE "payment_gateways" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false;

-- USER SAVED ADDRESSES
CREATE TABLE IF NOT EXISTS "user_saved_addresses" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "street_address" text NOT NULL,
  "district" text NOT NULL,
  "landmark_note" text NOT NULL
);

-- EXTREME LOCATION TIERS
CREATE TABLE IF NOT EXISTS "extreme_location_tiers" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "surcharge" integer NOT NULL
);

-- EXTREME LOCATIONS
CREATE TABLE IF NOT EXISTS "extreme_locations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "tier_id" text NOT NULL REFERENCES "extreme_location_tiers"("id")
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS "employees" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "department" text NOT NULL,
  "status" text NOT NULL,
  "permissions" jsonb NOT NULL,
  "created_at" text NOT NULL
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "vendor_id" text NOT NULL REFERENCES "vendors"("id"),
  "customer_id" text NOT NULL REFERENCES "users"("id"),
  "author" text NOT NULL,
  "rating" integer NOT NULL,
  "comment" text NOT NULL,
  "created_at" text NOT NULL
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "user_name" text NOT NULL,
  "amount" integer NOT NULL,
  "type" text NOT NULL,
  "note" text,
  "created_at" text NOT NULL,
  "status" text,
  "gateway" text,
  "reference" text
);
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "gateway" text;
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "reference" text;

-- APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS "app_notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" text NOT NULL,
  "related_id" text
);
ALTER TABLE "app_notifications" ADD COLUMN IF NOT EXISTS "related_id" text;

-- PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" text NOT NULL
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "details" text,
  "created_at" text NOT NULL
);

-- PRODUCT REVIEWS
CREATE TABLE IF NOT EXISTS "product_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "user_id" text NOT NULL,
  "user_name" text NOT NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" text NOT NULL
);

-- PAYOUT LOGS
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
  "status" text NOT NULL DEFAULT 'released'
);
