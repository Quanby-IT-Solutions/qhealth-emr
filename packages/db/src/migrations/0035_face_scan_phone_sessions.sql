CREATE TABLE IF NOT EXISTS "face_scan_phone_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"facility_id" uuid,
	"encounter_id" uuid,
	"patient_id" uuid,
	"age" integer,
	"gender" text,
	"vitals" jsonb,
	"created_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "face_scan_phone_sessions"
		ADD CONSTRAINT "face_scan_phone_sessions_facility_id_facilities_id_fk"
		FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "face_scan_phone_sessions"
		ADD CONSTRAINT "face_scan_phone_sessions_encounter_id_encounters_id_fk"
		FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "face_scan_phone_sessions"
		ADD CONSTRAINT "face_scan_phone_sessions_patient_id_patients_id_fk"
		FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "face_scan_phone_sessions"
		ADD CONSTRAINT "face_scan_phone_sessions_created_by_user_id_users_id_fk"
		FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "face_scan_phone_sessions_token_hash_uniq"
	ON "face_scan_phone_sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "face_scan_phone_sessions_created_by_user_id_idx"
	ON "face_scan_phone_sessions" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "face_scan_phone_sessions_expires_at_idx"
	ON "face_scan_phone_sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "face_scan_phone_sessions_encounter_id_idx"
	ON "face_scan_phone_sessions" ("encounter_id");
CREATE INDEX IF NOT EXISTS "face_scan_phone_sessions_patient_id_idx"
	ON "face_scan_phone_sessions" ("patient_id");
