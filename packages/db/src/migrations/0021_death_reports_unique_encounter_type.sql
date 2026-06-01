CREATE UNIQUE INDEX IF NOT EXISTS "death_reports_encounter_report_type_uniq"
	ON "death_reports" ("encounter_id", "report_type")
	WHERE "encounter_id" IS NOT NULL;
