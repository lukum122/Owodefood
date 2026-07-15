CREATE TABLE "app_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_pickup_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"vendor_id" text NOT NULL,
	"vendor_name" text NOT NULL,
	"vendor_address" text NOT NULL,
	"delivery_address" text NOT NULL,
	"receipt_image_or_qr" text NOT NULL,
	"receipt_note" text,
	"delivery_fee" integer NOT NULL,
	"rider_id" text,
	"rider_name" text,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text NOT NULL,
	"service_fee" integer,
	"total_amount" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" text NOT NULL,
	"status" text,
	"gateway" text,
	"reference" text
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "addon_groups" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roles" jsonb;--> statement-breakpoint
ALTER TABLE "receipt_pickup_orders" ADD CONSTRAINT "receipt_pickup_orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_pickup_orders" ADD CONSTRAINT "receipt_pickup_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;