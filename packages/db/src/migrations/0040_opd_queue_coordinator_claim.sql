ALTER TABLE "encounters"
	ADD COLUMN IF NOT EXISTS "queue_called_by_staff_id" uuid;

ALTER TABLE "encounters"
	ADD COLUMN IF NOT EXISTS "queue_called_at" timestamp;

DO $$ BEGIN
	ALTER TABLE "encounters"
		ADD CONSTRAINT "encounters_queue_called_by_staff_id_staff_profiles_id_fk"
		FOREIGN KEY ("queue_called_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "encounters_queue_called_by_staff_id_idx"
	ON "encounters" ("queue_called_by_staff_id");
