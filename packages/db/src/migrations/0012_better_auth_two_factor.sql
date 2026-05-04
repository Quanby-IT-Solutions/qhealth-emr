-- Migration: Align Better Auth schema with the enabled two-factor plugin.
-- This repo currently cannot rely on the Better Auth CLI generator, so we
-- version the required schema changes manually.

ALTER TABLE "users"
	ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean;

UPDATE "users"
SET "two_factor_enabled" = false
WHERE "two_factor_enabled" IS NULL;

ALTER TABLE "users"
	ALTER COLUMN "two_factor_enabled" SET DEFAULT false;

ALTER TABLE "users"
	ALTER COLUMN "two_factor_enabled" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "two_factors" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "two_factors_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
		ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "two_factors_secret_idx"
	ON "two_factors" ("secret");

CREATE INDEX IF NOT EXISTS "two_factors_user_id_idx"
	ON "two_factors" ("user_id");
