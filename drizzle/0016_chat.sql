CREATE TABLE IF NOT EXISTS "chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"order_id" text,
	"pair" text,
	"owner_user_id" text,
	"owner_role" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"assigned_name" text,
	"attached_order_id" text,
	"last_message_at" text,
	"last_message_preview" text,
	"created_at" text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_order_idx" ON "chat_threads" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_owner_idx" ON "chat_threads" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_last_msg_idx" ON "chat_threads" ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_order_pair_uq" ON "chat_threads" ("order_id", "pair") WHERE "kind" = 'order';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_support_owner_uq" ON "chat_threads" ("owner_user_id", "owner_role") WHERE "kind" = 'support';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_role" text NOT NULL,
	"sender_name" text NOT NULL,
	"body" text,
	"image_url" text,
	"order_ref" text,
	"created_at" text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_thread_idx" ON "chat_messages" ("thread_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_reads_user_idx" ON "chat_reads" ("user_id");
