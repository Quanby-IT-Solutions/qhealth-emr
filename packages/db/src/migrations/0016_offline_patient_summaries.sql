-- Story 18.1: backend-prepared offline patient summary snapshots

CREATE TABLE IF NOT EXISTS "offline_patient_summaries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "patient_id" uuid NOT NULL,
    "summary_payload" jsonb NOT NULL,
    "prepared_at" timestamp NOT NULL DEFAULT now(),
    "source_job_id" uuid,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "offline_patient_summaries_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "offline_patient_summaries_patient_id_patients_id_fk"
        FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "offline_patient_summaries_source_job_id_offline_cache_jobs_id_fk"
        FOREIGN KEY ("source_job_id") REFERENCES "public"."offline_cache_jobs"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "offline_patient_summaries_facility_id_idx"
    ON "offline_patient_summaries" ("facility_id");
CREATE INDEX IF NOT EXISTS "offline_patient_summaries_patient_id_idx"
    ON "offline_patient_summaries" ("patient_id");
CREATE INDEX IF NOT EXISTS "offline_patient_summaries_prepared_at_idx"
    ON "offline_patient_summaries" ("prepared_at");
CREATE UNIQUE INDEX IF NOT EXISTS "offline_patient_summaries_facility_patient_uniq"
    ON "offline_patient_summaries" ("facility_id", "patient_id");

ALTER TABLE "offline_patient_summaries" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'offline_patient_summaries'
          AND policyname = 'offline_patient_summaries_facility_isolation'
    ) THEN
        CREATE POLICY "offline_patient_summaries_facility_isolation" ON "offline_patient_summaries"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;
END $$;
