-- Adds a login-level suspension flag directly to the users table. This
-- is separate from vendors.status/riders.status: those specifically
-- control storefront visibility and delivery availability, while this
-- controls whether the account can log in at all, regardless of role.
-- Needed for accounts that can't be deleted (order history, or a
-- vendor/rider profile) but still need a way to be restricted -- a plain
-- customer account with order history previously had no restriction
-- option at all.

ALTER TABLE "users" ADD COLUMN "is_suspended" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "suspended_reason" text;
