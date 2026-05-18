-- Story 14.2: signed telemedicine prescriptions and facility isolation.

ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "prc_license_number" text;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "ptr_number" text;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "signed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "signed_by_staff_id" uuid;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions"
	ADD COLUMN IF NOT EXISTS "sent_to_email" text;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "telemedicine_prescriptions"
		ADD CONSTRAINT "telemedicine_prescriptions_signed_by_staff_id_staff_profiles_id_fk"
		FOREIGN KEY ("signed_by_staff_id")
		REFERENCES "staff_profiles"("id")
		ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "telemedicine_appointments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "telemedicine_prescription_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "telemedicine_appointments_facility_isolation" ON "telemedicine_appointments"
	FOR ALL
	USING ("facility_id"::text = current_setting('app.current_facility_id', true))
	WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
--> statement-breakpoint

CREATE POLICY "telemedicine_encounters_facility_isolation" ON "telemedicine_encounters"
	FOR ALL
	USING ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	))
	WITH CHECK ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	));
--> statement-breakpoint

CREATE POLICY "telemedicine_prescriptions_facility_isolation" ON "telemedicine_prescriptions"
	FOR ALL
	USING ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	))
	WITH CHECK ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	));
--> statement-breakpoint

CREATE POLICY "telemedicine_prescription_items_facility_isolation" ON "telemedicine_prescription_items"
	FOR ALL
	USING ("prescription_id" IN (
		SELECT p."id"
		FROM "telemedicine_prescriptions" p
		INNER JOIN "telemedicine_appointments" a ON p."appointment_id" = a."id"
		WHERE a."facility_id"::text = current_setting('app.current_facility_id', true)
	))
	WITH CHECK ("prescription_id" IN (
		SELECT p."id"
		FROM "telemedicine_prescriptions" p
		INNER JOIN "telemedicine_appointments" a ON p."appointment_id" = a."id"
		WHERE a."facility_id"::text = current_setting('app.current_facility_id', true)
	));
--> statement-breakpoint

CREATE POLICY "telemedicine_abstracts_facility_isolation" ON "telemedicine_abstracts"
	FOR ALL
	USING ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	))
	WITH CHECK ("appointment_id" IN (
		SELECT "id" FROM "telemedicine_appointments"
		WHERE "facility_id"::text = current_setting('app.current_facility_id', true)
	));
