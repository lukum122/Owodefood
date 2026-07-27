CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"department" text NOT NULL,
	"status" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extreme_location_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"surcharge" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extreme_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"vendor_id" text NOT NULL,
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
	"tax" integer
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"desc" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"api_key" text,
	"secret_key" text,
	"contract_code" text,
	"bank_name" text,
	"account_number" text,
	"account_name" text,
	"is_active" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"image" text NOT NULL,
	"category" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"addons" jsonb,
	"max_addons" integer
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"author" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"status" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"street_address" text NOT NULL,
	"district" text NOT NULL,
	"landmark_note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" text NOT NULL,
	"gender" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"cuisine" text NOT NULL,
	"image" text NOT NULL,
	"rating" double precision DEFAULT 5 NOT NULL,
	"address" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	"opening_time" text,
	"closing_time" text,
	"opening_days" jsonb,
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
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extreme_locations" ADD CONSTRAINT "extreme_locations_tier_id_extreme_location_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."extreme_location_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_addresses" ADD CONSTRAINT "user_saved_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;