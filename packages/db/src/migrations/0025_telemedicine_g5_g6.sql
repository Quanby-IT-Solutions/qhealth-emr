-- G5: rename telemedicine_appointments.encounter_id → linked_core_encounter_id
-- (column never written by code; only existed as a placeholder FK to core encounters.
-- New name avoids collision with API response field `encounterId`, which serializes
-- the joined tele-encounter id from `telemedicine_encounters`.)
ALTER TABLE "telemedicine_appointments"
	RENAME COLUMN "encounter_id" TO "linked_core_encounter_id";
--> statement-breakpoint

-- G6: promote cancelled_at to timestamptz to match every other timestamp column on
-- this table. Existing rows are interpreted as UTC.
ALTER TABLE "telemedicine_appointments"
	ALTER COLUMN "cancelled_at" TYPE timestamptz USING "cancelled_at" AT TIME ZONE 'UTC';
