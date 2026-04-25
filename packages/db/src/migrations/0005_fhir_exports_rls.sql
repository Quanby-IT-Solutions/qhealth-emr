-- Migration: Facility-isolation RLS for fhir_exports
-- Every FHIR export is owned by the facility that created it.
-- An admin user must not be able to read, write, or act on another
-- facility's export records even when supplying a known export ID.
-- This policy follows the same pattern used by all clinical tables.

ALTER TABLE "fhir_exports" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fhir_exports'
      AND policyname = 'fhir_exports_facility_isolation'
  ) THEN
    CREATE POLICY "fhir_exports_facility_isolation" ON "fhir_exports"
      FOR ALL
      USING (facility_id::text = current_setting('app.current_facility_id', true))
      WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));
  END IF;
END $$;
