-- =============================================================================
-- Admin Dashboard Schema Alignment
--
-- Durable schema additions backing the current admin dashboard and related
-- governance surfaces. This migration exists because drizzle-kit generate is
-- not producing SQL reliably in this workspace, but the schema changes are
-- concrete and need a versioned migration artifact.
-- =============================================================================

-- Roles: soft-archive support
ALTER TABLE "roles"
    ADD COLUMN IF NOT EXISTS "is_archived" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

-- Problems: link diagnoses back to encounter for data-quality and HIM views
ALTER TABLE "problems"
    ADD COLUMN IF NOT EXISTS "encounter_id" uuid;

DO $$
BEGIN
    ALTER TABLE "problems"
        ADD CONSTRAINT "problems_encounter_id_encounters_id_fk"
        FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "problems_encounter_id_idx" ON "problems" ("encounter_id");

-- Orders: dangerous-drug compliance flag
ALTER TABLE "medication_orders"
    ADD COLUMN IF NOT EXISTS "no_refill_inscribed" boolean NOT NULL DEFAULT false;

-- Reference terminology: SNOMED CT
CREATE TABLE IF NOT EXISTS "snomed_ct_codes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "concept_id" text NOT NULL,
    "fsn" text NOT NULL,
    "preferred_term" text NOT NULL,
    "semantic_tag" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "snomed_ct_codes_concept_id_unique" UNIQUE("concept_id")
);

CREATE INDEX IF NOT EXISTS "snomed_ct_codes_concept_id_idx" ON "snomed_ct_codes" ("concept_id");
CREATE INDEX IF NOT EXISTS "snomed_ct_codes_preferred_term_idx" ON "snomed_ct_codes" ("preferred_term");
CREATE INDEX IF NOT EXISTS "snomed_ct_codes_semantic_tag_idx" ON "snomed_ct_codes" ("semantic_tag");

-- HIM chart release and medical certificate requests
CREATE TABLE IF NOT EXISTS "medical_records_requests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "patient_id" uuid NOT NULL,
    "encounter_id" uuid,
    "request_type" text NOT NULL,
    "requested_by_name" text NOT NULL,
    "requested_by_relationship" text,
    "purpose" text,
    "status" text NOT NULL DEFAULT 'pending',
    "processed_by_staff_id" uuid,
    "completed_at" timestamp,
    "rejection_reason" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "medical_records_requests_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "medical_records_requests_patient_id_patients_id_fk"
        FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "medical_records_requests_encounter_id_encounters_id_fk"
        FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "medical_records_requests_processed_by_staff_id_staff_profiles_id_fk"
        FOREIGN KEY ("processed_by_staff_id") REFERENCES "public"."staff_profiles"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "medical_records_requests_facility_id_idx" ON "medical_records_requests" ("facility_id");
CREATE INDEX IF NOT EXISTS "medical_records_requests_patient_id_idx" ON "medical_records_requests" ("patient_id");
CREATE INDEX IF NOT EXISTS "medical_records_requests_status_idx" ON "medical_records_requests" ("status");
CREATE INDEX IF NOT EXISTS "medical_records_requests_request_type_idx" ON "medical_records_requests" ("request_type");

-- Export audit trail for DPA consent-gated transmissions
CREATE TABLE IF NOT EXISTS "data_exports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "actor_user_id" text NOT NULL,
    "actor_staff_id" uuid,
    "entity_type" text NOT NULL,
    "entity_id" uuid,
    "destination" text,
    "transmission_scope" text,
    "consent_gated" boolean NOT NULL DEFAULT true,
    "consent_outcome" text,
    "status" text NOT NULL DEFAULT 'completed',
    "rejection_reason" text,
    "exported_at" timestamp NOT NULL DEFAULT now(),
    "ip_address" text,
    CONSTRAINT "data_exports_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "data_exports_actor_user_id_users_id_fk"
        FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "data_exports_actor_staff_id_staff_profiles_id_fk"
        FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_profiles"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "data_exports_facility_id_idx" ON "data_exports" ("facility_id");
CREATE INDEX IF NOT EXISTS "data_exports_actor_user_id_idx" ON "data_exports" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "data_exports_exported_at_idx" ON "data_exports" ("exported_at");
CREATE INDEX IF NOT EXISTS "data_exports_entity_type_idx" ON "data_exports" ("entity_type");

-- Offline continuity cache job history
CREATE TABLE IF NOT EXISTS "offline_cache_jobs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "status" text NOT NULL,
    "started_at" timestamp NOT NULL DEFAULT now(),
    "completed_at" timestamp,
    "cached_patient_count" integer,
    "error_message" text,
    "triggered_by" text NOT NULL DEFAULT 'scheduler',
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "offline_cache_jobs_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "offline_cache_jobs_facility_id_idx" ON "offline_cache_jobs" ("facility_id");
CREATE INDEX IF NOT EXISTS "offline_cache_jobs_status_idx" ON "offline_cache_jobs" ("status");
CREATE INDEX IF NOT EXISTS "offline_cache_jobs_started_at_idx" ON "offline_cache_jobs" ("started_at");

-- Civil registry birth registration tracking
CREATE TABLE IF NOT EXISTS "birth_registrations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "patient_id" uuid NOT NULL,
    "encounter_id" uuid,
    "birth_datetime" timestamp NOT NULL,
    "registered_by_staff_id" uuid,
    "certificate_number" text,
    "status" text NOT NULL DEFAULT 'draft',
    "completed_at" timestamp,
    "submitted_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "birth_registrations_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "birth_registrations_patient_id_patients_id_fk"
        FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "birth_registrations_encounter_id_encounters_id_fk"
        FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "birth_registrations_registered_by_staff_id_staff_profiles_id_fk"
        FOREIGN KEY ("registered_by_staff_id") REFERENCES "public"."staff_profiles"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "birth_registrations_facility_id_idx" ON "birth_registrations" ("facility_id");
CREATE INDEX IF NOT EXISTS "birth_registrations_patient_id_idx" ON "birth_registrations" ("patient_id");
CREATE INDEX IF NOT EXISTS "birth_registrations_status_idx" ON "birth_registrations" ("status");
CREATE INDEX IF NOT EXISTS "birth_registrations_birth_datetime_idx" ON "birth_registrations" ("birth_datetime");

-- SLA configuration storage backing the admin dashboard and SLA settings
CREATE TABLE IF NOT EXISTS "sla_configs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "facility_id" uuid NOT NULL,
    "workflow_type" text NOT NULL,
    "target_minutes" integer NOT NULL,
    "warning_threshold_pct" integer NOT NULL DEFAULT 80,
    "is_active" boolean NOT NULL DEFAULT true,
    "description" text NOT NULL DEFAULT '',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "sla_configs_facility_id_facilities_id_fk"
        FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "sla_configs_facility_id_idx" ON "sla_configs" ("facility_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sla_configs_facility_workflow_uniq" ON "sla_configs" ("facility_id", "workflow_type");

-- Row-level security for new facility-scoped tables
ALTER TABLE "medical_records_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_exports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offline_cache_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "birth_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_configs" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'medical_records_requests' AND policyname = 'medical_records_requests_facility_isolation'
    ) THEN
        CREATE POLICY "medical_records_requests_facility_isolation" ON "medical_records_requests"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'data_exports' AND policyname = 'data_exports_facility_isolation'
    ) THEN
        CREATE POLICY "data_exports_facility_isolation" ON "data_exports"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offline_cache_jobs' AND policyname = 'offline_cache_jobs_facility_isolation'
    ) THEN
        CREATE POLICY "offline_cache_jobs_facility_isolation" ON "offline_cache_jobs"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'birth_registrations' AND policyname = 'birth_registrations_facility_isolation'
    ) THEN
        CREATE POLICY "birth_registrations_facility_isolation" ON "birth_registrations"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'sla_configs' AND policyname = 'sla_configs_facility_isolation'
    ) THEN
        CREATE POLICY "sla_configs_facility_isolation" ON "sla_configs"
            FOR ALL USING ("facility_id"::text = current_setting('app.current_facility_id', true))
            WITH CHECK ("facility_id"::text = current_setting('app.current_facility_id', true));
    END IF;
END $$;