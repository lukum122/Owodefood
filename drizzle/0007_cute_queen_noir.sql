-- Adds indexes on every foreign-key-style field actually used in a
-- WHERE clause today, based on the real query patterns in server.ts --
-- not a guess. Every statement is IF NOT EXISTS, safe to re-run.
--
-- Also adds a functional index on lower(email), since login compares
-- lower(users.email) = ... -- a plain index on email would silently
-- never be used by Postgres for that comparison; it needs an index on
-- the same expression the query actually uses.
CREATE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" (lower("email"));--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "app_notifications_user_id_idx" ON "app_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extreme_locations_tier_id_idx" ON "extreme_locations" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_vendor_id_idx" ON "orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_logs_order_id_idx" ON "payout_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_logs_recipient_id_idx" ON "payout_logs" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_vendor_id_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_vendor_id_idx" ON "reviews" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_customer_id_idx" ON "reviews" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "riders_user_id_idx" ON "riders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_saved_addresses_user_id_idx" ON "user_saved_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendors_user_id_idx" ON "vendors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_transactions_user_id_idx" ON "wallet_transactions" USING btree ("user_id");
