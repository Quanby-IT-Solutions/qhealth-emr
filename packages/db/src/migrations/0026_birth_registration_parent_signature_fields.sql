ALTER TABLE "birth_registrations"
	ADD COLUMN IF NOT EXISTS "father_name" text,
	ADD COLUMN IF NOT EXISTS "mother_name" text,
	ADD COLUMN IF NOT EXISTS "physician_signature" text;
