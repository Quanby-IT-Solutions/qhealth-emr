-- Migration: extend anesthesia_records with intubation grade, difficult airway flag,
-- intraoperative medications, and sign-off tracking columns (Story 9.2)

ALTER TABLE "anesthesia_records"
	ADD COLUMN "intubation_grade" text;
--> statement-breakpoint

ALTER TABLE "anesthesia_records"
	ADD COLUMN "difficult_airway" boolean DEFAULT false;
--> statement-breakpoint

UPDATE "anesthesia_records" SET "difficult_airway" = false WHERE "difficult_airway" IS NULL;
--> statement-breakpoint

ALTER TABLE "anesthesia_records"
	ALTER COLUMN "difficult_airway" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "anesthesia_records"
	ADD COLUMN "intraop_medications" jsonb;
--> statement-breakpoint

ALTER TABLE "anesthesia_records"
	ADD COLUMN "signed_by_staff_id" uuid REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX "anesthesia_records_signed_by_staff_id_idx"
	ON "anesthesia_records" ("signed_by_staff_id");
