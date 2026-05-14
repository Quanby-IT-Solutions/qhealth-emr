-- Flow D5: Allergy verification gate
-- Adds verification state to allergies so only physician-verified active
-- allergies drive CDS / CPOE medication blocking. Newly captured allergies
-- default to unverified.

ALTER TABLE "allergies"
  ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "verified_by_staff_id" uuid REFERENCES "staff_profiles"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "allergies_is_verified_idx" ON "allergies" ("is_verified");
