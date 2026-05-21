CREATE TABLE IF NOT EXISTS "death_certificate_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"death_datetime" timestamp NOT NULL,
	"registered_by_staff_id" uuid,
	"certificate_number" text,
	"deceased_name" text,
	"deceased_mrn" text,
	"age_at_death_years" integer,
	"deceased_address" text,
	"place_of_death" text,
	"cause_of_death_immediate" text,
	"cause_of_death_antecedent" text,
	"cause_of_death_underlying" text,
	"cause_of_death_contributing" text,
	"informant_name" text,
	"informant_relationship" text,
	"physician_name" text,
	"physician_license_no" text,
	"physician_signature" text,
	"certification_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"requested_at" timestamp,
	"paid_at" timestamp,
	"released_by_staff_id" uuid,
	"released_at" timestamp,
	"completed_at" timestamp,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "death_certificate_registrations"
	ADD CONSTRAINT "death_certificate_registrations_facility_id_facilities_id_fk"
	FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "death_certificate_registrations"
	ADD CONSTRAINT "death_certificate_registrations_patient_id_patients_id_fk"
	FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "death_certificate_registrations"
	ADD CONSTRAINT "death_certificate_registrations_encounter_id_encounters_id_fk"
	FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "death_certificate_registrations"
	ADD CONSTRAINT "death_certificate_registrations_registered_by_staff_id_staff_profiles_id_fk"
	FOREIGN KEY ("registered_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "death_certificate_registrations"
	ADD CONSTRAINT "death_certificate_registrations_released_by_staff_id_staff_profiles_id_fk"
	FOREIGN KEY ("released_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "death_certificate_registrations_facility_id_idx"
	ON "death_certificate_registrations" USING btree ("facility_id");
CREATE INDEX IF NOT EXISTS "death_certificate_registrations_patient_id_idx"
	ON "death_certificate_registrations" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "death_certificate_registrations_status_idx"
	ON "death_certificate_registrations" USING btree ("status");
CREATE INDEX IF NOT EXISTS "death_certificate_registrations_death_datetime_idx"
	ON "death_certificate_registrations" USING btree ("death_datetime");
