ALTER TABLE "birth_registrations"
	ADD COLUMN IF NOT EXISTS "attendant_at_birth" text,
	ADD COLUMN IF NOT EXISTS "place_of_birth_barangay" text,
	ADD COLUMN IF NOT EXISTS "place_of_birth_municipality" text,
	ADD COLUMN IF NOT EXISTS "place_of_birth_province" text,
	ADD COLUMN IF NOT EXISTS "place_of_birth_region" text,
	ADD COLUMN IF NOT EXISTS "physician_name" text,
	ADD COLUMN IF NOT EXISTS "physician_license_no" text,
	ADD COLUMN IF NOT EXISTS "attending_staff_id" uuid REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
