CREATE TABLE "accounts" (
	"id" text,
	"account_id" text,
	"provider_id" text,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_pkey" PRIMARY KEY("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL UNIQUE,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text,
	"identifier" text,
	"value" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "verifications_pkey" PRIMARY KEY("identifier","value")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"facility_type" text NOT NULL,
	"address" text,
	"doh_license_number" text,
	"philhealth_accreditation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"role_id" uuid NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"facility_id" uuid NOT NULL,
	"employee_number" text,
	"department" text,
	"prc_license_number" text,
	"prc_expiry" date,
	"ptr_number" text,
	"ptr_expiry" date,
	"pdea_s2_license" text,
	"pdea_s2_expiry" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"staff_profile_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bed_census_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"ward_id" uuid,
	"snapshot_date" date NOT NULL,
	"total_beds" integer DEFAULT 0 NOT NULL,
	"occupied_beds" integer DEFAULT 0 NOT NULL,
	"bor_percentage" numeric(5,2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bed_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"bed_id" uuid NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ward_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"bed_number" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"current_encounter_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"workflow_type" text NOT NULL,
	"sla_target_minutes" integer,
	"actual_minutes" integer,
	"staff_id" uuid,
	"is_escalated" boolean DEFAULT false NOT NULL,
	"escalated_at" timestamp,
	"notes" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"from_ward_id" uuid,
	"from_bed_id" uuid,
	"to_ward_id" uuid,
	"to_bed_id" uuid,
	"transfer_reason" text,
	"ordering_staff_id" uuid,
	"transferred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"chief_complaint" text,
	"admitting_staff_id" uuid,
	"attending_staff_id" uuid,
	"bed_id" uuid,
	"admission_datetime" timestamp DEFAULT now() NOT NULL,
	"discharge_datetime" timestamp,
	"disposition" text,
	"oecb_eligible" boolean DEFAULT false NOT NULL,
	"merged_from_pre_encounter_id" uuid,
	"linked_encounter_id" uuid,
	"konsulta_tagged" boolean DEFAULT false NOT NULL,
	"appointment_id" uuid,
	"queue_number" integer,
	"clinician_staff_id" uuid,
	"queue_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opd_triage_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid,
	"arrival_time" timestamp DEFAULT now() NOT NULL,
	"chief_complaint" text NOT NULL,
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"temperature_celsius" real,
	"heart_rate_bpm" integer,
	"respiratory_rate" integer,
	"oxygen_sat_pct" real,
	"height_cm" real,
	"weight_kg" real,
	"triage_nurse_staff_id" uuid,
	"clinician_staff_id" uuid,
	"status" text DEFAULT 'pending_registration' NOT NULL,
	"encounter_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"mrn" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_name" text,
	"date_of_birth" date NOT NULL,
	"sex" text NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"province" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"philhealth_member_id" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"next_of_kin_name" text,
	"next_of_kin_relationship" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"trauma_alias" text NOT NULL,
	"chief_complaint" text,
	"triage_acuity_scale" text,
	"triage_acuity_level" integer,
	"triage_datetime" timestamp,
	"triage_staff_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"merged_to_encounter_id" uuid,
	"merged_at" timestamp,
	"merge_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ward_type" text NOT NULL,
	"total_beds" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergen_name" text NOT NULL,
	"allergen_type" text NOT NULL,
	"reaction_type" text,
	"severity" text NOT NULL,
	"onset_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"documenting_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"template_id" uuid,
	"note_type" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"structured_data" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_staff_id" uuid NOT NULL,
	"signed_at" timestamp,
	"signed_ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"signed_by_name" text NOT NULL,
	"relationship" text NOT NULL,
	"content" text,
	"signature_data" jsonb,
	"signed_at" timestamp,
	"witness_staff_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"consent_text" text DEFAULT '' NOT NULL,
	"patient_signature" text,
	"guardian_signature" text,
	"witness_signature" text,
	"captured_by_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"request_type" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_by_relationship" text,
	"purpose" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_by_staff_id" uuid,
	"completed_at" timestamp,
	"paid_at" timestamp,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"dpa_consent_obtained" boolean DEFAULT false NOT NULL,
	"released_by_staff_id" uuid,
	"released_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_addenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"note_id" uuid NOT NULL,
	"content" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_staff_id" uuid NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"sections" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"icd10_code" text,
	"icd10_display" text,
	"snomed_code" text,
	"snomed_display" text,
	"description" text NOT NULL,
	"onset_date" date,
	"resolution_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"documenting_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"catalog_type" text NOT NULL,
	"version_tag" text NOT NULL,
	"published_by_user_id" text NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_set_catalog_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"catalog_type" text NOT NULL,
	"version" text,
	"notes" text,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deprecated_code_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"catalog_type" text NOT NULL,
	"from_code" text NOT NULL,
	"to_code" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"drug_generic_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"manufacturer" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_generics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"generic_name" text NOT NULL,
	"rxnorm_code" text,
	"atc_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formulary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"drug_generic_id" uuid NOT NULL,
	"drug_brand_id" uuid,
	"dose_form" text NOT NULL,
	"strength" text NOT NULL,
	"route" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_high_alert" boolean DEFAULT false NOT NULL,
	"high_alert_notes" text,
	"is_restricted" boolean DEFAULT false NOT NULL,
	"restriction_notes" text,
	"formulary_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icd10_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL UNIQUE,
	"description" text NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loinc_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"loinc_num" text NOT NULL UNIQUE,
	"component" text,
	"property" text,
	"time_aspect" text,
	"system" text,
	"scale" text,
	"method" text,
	"long_common_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rvs_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rvs_code" text NOT NULL UNIQUE,
	"procedure_name" text NOT NULL,
	"category" text,
	"rvs_value" numeric(10,2),
	"effective_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rxnorm_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rxcui" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"tty" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snomed_ct_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"concept_id" text NOT NULL UNIQUE,
	"fsn" text NOT NULL,
	"preferred_term" text NOT NULL,
	"semantic_tag" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid,
	"medication_order_id" uuid,
	"checklist_items" jsonb DEFAULT '[]' NOT NULL,
	"patient_signature" text,
	"pharmacist_staff_id" uuid NOT NULL,
	"counseled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispense_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"medication_order_id" uuid NOT NULL,
	"patient_id" uuid,
	"dispensed_quantity" numeric(8,2) NOT NULL,
	"quantity_unit" text NOT NULL,
	"lot_number" text,
	"expiry_date" date,
	"counseling_notes" text,
	"patient_education" jsonb,
	"pharmacist_staff_id" uuid NOT NULL,
	"dispensed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "high_alert_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"medication_order_id" uuid NOT NULL,
	"requesting_staff_id" uuid NOT NULL,
	"verifying_staff_id" uuid NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"modality" text NOT NULL,
	"body_part" text NOT NULL,
	"clinical_indication" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'ordered' NOT NULL,
	"ordering_staff_id" uuid NOT NULL,
	"scheduled_datetime" timestamp,
	"study_started_at" timestamp,
	"imaging_order_received_at" timestamp,
	"billing_cleared_at" timestamp,
	"completed_datetime" timestamp,
	"report" text,
	"structured_results" jsonb,
	"cds_alerts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"loinc_code" text,
	"panel_code" text,
	"test_name" text NOT NULL,
	"panel_name" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'ordered' NOT NULL,
	"specimen_type" text,
	"ordering_staff_id" uuid NOT NULL,
	"collection_datetime" timestamp,
	"specimen_received_at" timestamp,
	"billing_cleared_at" timestamp,
	"resulted_datetime" timestamp,
	"results" jsonb,
	"cds_alerts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"formulary_item_id" uuid,
	"generic_name" text NOT NULL,
	"brand_name" text,
	"rxnorm_code" text,
	"dose" text NOT NULL,
	"dose_unit" text NOT NULL,
	"dose_form" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text NOT NULL,
	"duration_days" integer,
	"special_instructions" text,
	"is_prn" boolean DEFAULT false NOT NULL,
	"prn_reason" text,
	"is_controlled_substance" boolean DEFAULT false NOT NULL,
	"pdea_schedule" text,
	"pdea_tranche_number" integer,
	"pdea_tranche_total" integer,
	"no_refill_inscribed" boolean DEFAULT false NOT NULL,
	"parent_order_id" uuid,
	"status" text DEFAULT 'pending_verification' NOT NULL,
	"ordering_staff_id" uuid NOT NULL,
	"cds_alerts" jsonb,
	"cds_overrides" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"medication_order_id" uuid NOT NULL,
	"action" text NOT NULL,
	"pharmacist_staff_id" uuid NOT NULL,
	"rejection_reason" text,
	"modification_notes" text,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"medication_order_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescriber_staff_id" uuid NOT NULL,
	"prc_license_number" text NOT NULL,
	"ptr_number" text NOT NULL,
	"pdea_s2_license" text,
	"prescription_content" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flowsheet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"parameter_name" text NOT NULL,
	"parameter_value" text NOT NULL,
	"unit" text,
	"recorded_by_staff_id" uuid NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hai_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"hai_type" text NOT NULL,
	"onset_date" date NOT NULL,
	"confirmed_at" timestamp,
	"resolved_at" timestamp,
	"status" text DEFAULT 'suspected' NOT NULL,
	"notes" text,
	"documented_by_staff_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "io_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"io_type" text NOT NULL,
	"route" text NOT NULL,
	"description" text,
	"amount_ml" numeric(8,1) NOT NULL,
	"recorded_by_staff_id" uuid NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mar_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"medication_order_id" uuid NOT NULL,
	"scheduled_time" timestamp NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"administered_dose" text,
	"administered_route" text,
	"prn_reason" text,
	"administered_by_staff_id" uuid,
	"administered_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"outgoing_staff_id" uuid NOT NULL,
	"incoming_staff_id" uuid,
	"handoff_notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tar_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"treatment_description" text NOT NULL,
	"scheduled_time" timestamp NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"administered_by_staff_id" uuid,
	"administered_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"pre_encounter_id" uuid,
	"temperature" numeric(4,1),
	"bp_systolic" integer,
	"bp_diastolic" integer,
	"heart_rate" integer,
	"respiratory_rate" integer,
	"spo2" numeric(4,1),
	"pain_score" integer,
	"weight" numeric(5,2),
	"height" numeric(5,2),
	"news_score" integer,
	"news_risk_level" text,
	"recorded_by_staff_id" uuid NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf4_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"invoice_id" uuid,
	"claim_number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_data" jsonb,
	"response_data" jsonb,
	"extracted_data" jsonb,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf5_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"cf4_claim_id" uuid,
	"drg_code" text,
	"drg_description" text,
	"drg_weight" numeric(8,4),
	"drg_grouper" text,
	"validated_by_staff_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_data" jsonb,
	"response_data" jsonb,
	"validated_at" timestamp,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_master_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"rvs_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"charge_master_item_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(8,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"total_amount" numeric(14,2) NOT NULL,
	"source_type" text NOT NULL,
	"source_order_id" uuid,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eligibility_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"philhealth_member_id" text NOT NULL,
	"check_status" text DEFAULT 'pending' NOT NULL,
	"check_response" jsonb,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_id" uuid NOT NULL,
	"charge_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(8,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"total_amount" numeric(14,2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"subtotal" numeric(14,2) DEFAULT '0' NOT NULL,
	"philhealth_coverage" numeric(14,2) DEFAULT '0' NOT NULL,
	"patient_responsibility" numeric(14,2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"finalized_at" timestamp,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"payment_method" text NOT NULL,
	"reference_number" text,
	"received_by_staff_id" uuid NOT NULL,
	"payment_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ahsr_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"report_year" integer NOT NULL,
	"report_month" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"generated_by_staff_id" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fhir_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"export_date_range" jsonb,
	"resource_types" jsonb,
	"total_resources" integer DEFAULT 0 NOT NULL,
	"valid_resources" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"validation_report" jsonb,
	"export_format" text DEFAULT 'ndjson' NOT NULL,
	"export_file_url" text,
	"bundle_data" text,
	"submission_status" text DEFAULT 'pending' NOT NULL,
	"nhdr_acknowledgment" jsonb,
	"initiated_by_staff_id" uuid NOT NULL,
	"exported_at" timestamp,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pidsr_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"disease_code" text NOT NULL,
	"disease_name" text NOT NULL,
	"category" text,
	"case_classification" text NOT NULL,
	"onset_date" date,
	"diagnosis_date" date NOT NULL,
	"reporting_staff_id" uuid NOT NULL,
	"report_status" text DEFAULT 'draft' NOT NULL,
	"submission_data" jsonb,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveillance_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"note_id" uuid,
	"flag_type" text NOT NULL,
	"triggered_by" text NOT NULL,
	"trigger_value" text NOT NULL,
	"is_reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_by_staff_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"staff_profile_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "break_glass_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"reason_category" text NOT NULL,
	"justification" text NOT NULL,
	"access_granted_at" timestamp DEFAULT now() NOT NULL,
	"access_expires_at" timestamp NOT NULL,
	"records_accessed" jsonb,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_staff_id" uuid,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_staff_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"destination" text,
	"transmission_scope" text,
	"consent_gated" boolean DEFAULT true NOT NULL,
	"consent_outcome" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"rejection_reason" text,
	"exported_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"recipient_staff_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anesthesia_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"surgical_case_id" uuid,
	"operation_record_id" uuid,
	"encounter_id" uuid,
	"asa_class" text,
	"anesthesia_type" text,
	"airway_type" text,
	"airway_management" text,
	"intubation_attempts" integer,
	"agents" jsonb,
	"induction_agents" jsonb,
	"maintenance_agents" jsonb,
	"muscle_relaxants" jsonb,
	"intraop_vitals" jsonb,
	"fluid_balance" jsonb,
	"reversal_agent" text,
	"total_anesthesia_minutes" integer,
	"emergence_smooth" boolean,
	"complications" text,
	"post_anesthesia_care_notes" text,
	"anesthesiologist_staff_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"surgical_case_id" uuid,
	"encounter_id" uuid,
	"pre_op_diagnosis" text,
	"post_op_diagnosis" text,
	"procedure_performed" text,
	"procedure_description" text,
	"operative_technique" text,
	"findings" text,
	"specimens" text,
	"estimated_blood_loss" integer,
	"fluid_in" integer,
	"fluid_out" integer,
	"incision_time" timestamp,
	"closure_time" timestamp,
	"surgeon_staff_id" uuid NOT NULL,
	"first_assistant_staff_id" uuid,
	"second_assistant_staff_id" uuid,
	"scrub_nurse_staff_id" uuid,
	"circulating_nurse_staff_id" uuid,
	"assistant_staff_ids" jsonb,
	"anesthesiologist_staff_id" uuid,
	"instrument_count_correct" boolean DEFAULT false NOT NULL,
	"swab_count_correct" boolean DEFAULT false NOT NULL,
	"complications" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"signed_by_staff_id" uuid,
	"scheduling_requested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surgical_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"procedure_name" text NOT NULL,
	"or_suite" text,
	"surgical_type" text NOT NULL,
	"surgeon_staff_id" uuid,
	"anesthesiologist_staff_id" uuid,
	"scheduled_datetime" timestamp,
	"actual_start_datetime" timestamp,
	"actual_end_datetime" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"asa_class" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surgical_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"surgical_case_id" uuid,
	"encounter_id" uuid,
	"operation_record_id" uuid,
	"items" jsonb,
	"all_clear" boolean DEFAULT false NOT NULL,
	"npo_status" boolean,
	"meds_held" jsonb,
	"labs_reviewed" boolean,
	"consent_signed" boolean,
	"site_marked" boolean,
	"allergies_verified" boolean,
	"blood_available" boolean,
	"equipment_checked" boolean,
	"checklist_phase" text,
	"completed_by_staff_id" uuid,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surgical_rvs_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"surgical_case_id" uuid,
	"operation_record_id" uuid,
	"rvs_code_id" uuid,
	"rvs_code" text,
	"rvs_description" text,
	"modifier" text,
	"units" integer DEFAULT 1 NOT NULL,
	"suggested_by_staff_id" uuid,
	"validated_by_staff_id" uuid,
	"finalized_by_staff_id" uuid,
	"status" text DEFAULT 'suggested' NOT NULL,
	"suggested_at" timestamp DEFAULT now() NOT NULL,
	"validated_at" timestamp,
	"finalized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"clinic_template_id" uuid,
	"patient_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" time NOT NULL,
	"queue_number" integer,
	"status" text DEFAULT 'booked' NOT NULL,
	"checked_in_at" timestamp,
	"encounter_type" text DEFAULT 'outpatient' NOT NULL,
	"chief_complaint" text,
	"notes" text,
	"booked_by_staff_id" uuid,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"clinic_name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"max_patients" integer DEFAULT 20 NOT NULL,
	"slot_duration_minutes" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nbs_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"mother_patient_id" uuid,
	"birth_datetime" timestamp NOT NULL,
	"screening_datetime" timestamp,
	"hours_elapsed" integer,
	"screening_result" jsonb,
	"consent_record_id" uuid,
	"consent_status" text DEFAULT 'pending' NOT NULL,
	"waiver_reason" text,
	"referral_status" text DEFAULT 'none' NOT NULL,
	"referral_facility" text,
	"referral_date" date,
	"referral_notes" text,
	"screened_by_staff_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "death_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"death_datetime" timestamp NOT NULL,
	"cause_of_death" text NOT NULL,
	"contributing_factors" jsonb,
	"maternal_history" jsonb,
	"neonatal_details" jsonb,
	"physician_certification" jsonb,
	"certifying_staff_id" uuid,
	"pdf_snapshot_url" text,
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
--> statement-breakpoint
CREATE TABLE "birth_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"birth_datetime" timestamp NOT NULL,
	"registered_by_staff_id" uuid,
	"certificate_number" text,
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
--> statement-breakpoint
CREATE TABLE "nutrition_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"screening_tool" text NOT NULL,
	"screening_score" integer,
	"malnutrition_risk" text,
	"full_assessment_data" jsonb,
	"meal_plan" jsonb,
	"assessed_by_staff_id" uuid NOT NULL,
	"next_reassessment_date" date,
	"status" text DEFAULT 'screening' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "msw_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"evaluation_findings" jsonb,
	"coe_issued" boolean DEFAULT false NOT NULL,
	"coe_number" text,
	"coe_program" text,
	"malasakit_amount" numeric(14,2),
	"malasakit_source" jsonb,
	"konsulta_tagged" boolean DEFAULT false NOT NULL,
	"z_benefits_tagged" boolean DEFAULT false NOT NULL,
	"4ps_beneficiary" boolean DEFAULT false NOT NULL,
	"evaluated_by_staff_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_staff_id" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_abstracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"encounter_id" uuid NOT NULL UNIQUE,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"chief_complaint" text DEFAULT '' NOT NULL,
	"subjective_notes" text DEFAULT '' NOT NULL,
	"objective_notes" text DEFAULT '' NOT NULL,
	"assessment_notes" text DEFAULT '' NOT NULL,
	"plan_notes" text DEFAULT '' NOT NULL,
	"diagnosis" text DEFAULT '' NOT NULL,
	"icd_code" text,
	"additional_notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"signed_by_staff_id" uuid,
	"sent_at" timestamp,
	"sent_to_email" text,
	"created_by_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"platform" text DEFAULT 'zoom' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"video_link" text,
	"meeting_id" text,
	"meeting_password" text,
	"notes" text,
	"encounter_id" uuid,
	"created_by_staff_id" uuid,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"encounter_type" text DEFAULT 'standalone' NOT NULL,
	"linked_encounter_id" uuid,
	"patient_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"chief_complaint" text DEFAULT '' NOT NULL,
	"subjective_notes" text DEFAULT '' NOT NULL,
	"objective_notes" text DEFAULT '' NOT NULL,
	"assessment_notes" text DEFAULT '' NOT NULL,
	"plan_notes" text DEFAULT '' NOT NULL,
	"diagnosis" text DEFAULT '' NOT NULL,
	"icd_code" text,
	"vital_signs" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"signed_at" timestamp,
	"signed_by_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"prescription_id" uuid NOT NULL,
	"generic_name" text NOT NULL,
	"brand_name" text,
	"dosage" text NOT NULL,
	"form" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"frequency" text NOT NULL,
	"duration" text NOT NULL,
	"route" text NOT NULL,
	"instructions" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"encounter_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"prescription_date" date NOT NULL,
	"valid_until" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"dispensing_instructions" text,
	"created_by_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"flag_id" uuid NOT NULL,
	"environment" text,
	"facility_id" uuid,
	"role_id" uuid,
	"enabled" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"group" text NOT NULL,
	"risk_level" text NOT NULL,
	"owner_team" text,
	"default_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_cache_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cached_patient_count" integer,
	"error_message" text,
	"triggered_by" text DEFAULT 'scheduler' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"facility_id" uuid PRIMARY KEY,
	"timezone" text DEFAULT 'Asia/Manila' NOT NULL,
	"chart_retention_years" integer DEFAULT 10 NOT NULL,
	"support_mailbox" text,
	"service_desk_hotline" text,
	"break_glass_requires_reason" boolean DEFAULT true NOT NULL,
	"auto_freeze_charges_on_discharge" boolean DEFAULT true NOT NULL,
	"require_dpa_consent_before_export" boolean DEFAULT true NOT NULL,
	"enable_offline_summary_cache" boolean DEFAULT true NOT NULL,
	"policy_sections" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "facility_profiles" (
	"facility_id" uuid PRIMARY KEY,
	"facility_code" text UNIQUE,
	"governing_authority" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"province" text,
	"zip_code" text,
	"telephone" text,
	"email" text,
	"admin_contact_name" text,
	"admin_contact_email" text,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integration_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"integration_id" uuid NOT NULL,
	"label" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"credentials_ref" text,
	"webhook_url" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"notes" text,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"last_tested_at" timestamp,
	"last_test_status" text,
	"last_test_readiness_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"integration_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"signing_secret_hash" text NOT NULL,
	"subscribed_events" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_delivery_at" timestamp,
	"last_delivery_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"workflow_type" text NOT NULL,
	"target_minutes" integer NOT NULL,
	"warning_threshold_pct" integer DEFAULT 80 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_step_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"step_type" text NOT NULL,
	"target_minutes" integer NOT NULL,
	"warning_threshold_pct" integer DEFAULT 80 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_status_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"workflow" text NOT NULL,
	"step" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"is_breached" boolean DEFAULT false NOT NULL,
	"is_hard_cap_breached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinician_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"staff_profile_id" uuid NOT NULL,
	"license_type" text NOT NULL,
	"license_number" text NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"document_uri" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"verification_proof" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bed_census_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"ward_id" uuid,
	"census_date" date NOT NULL,
	"midnight_census" integer DEFAULT 0 NOT NULL,
	"admissions" integer DEFAULT 0 NOT NULL,
	"discharges" integer DEFAULT 0 NOT NULL,
	"deaths_within_48h" integer DEFAULT 0 NOT NULL,
	"deaths_after_48h" integer DEFAULT 0 NOT NULL,
	"available_beds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fhir_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"fhir_version" text DEFAULT 'R4' NOT NULL,
	"auth_method" text DEFAULT 'none' NOT NULL,
	"auth_credentials_ref" text,
	"resource_types" jsonb DEFAULT '[]' NOT NULL,
	"cron_schedule" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_tested_at" timestamp,
	"last_test_status" text,
	"last_test_latency_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fhir_exchange_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"endpoint_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"status" text NOT NULL,
	"http_status" integer,
	"error_message" text,
	"duration_ms" integer,
	"fhir_version_id" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source_code_id" uuid NOT NULL,
	"target_code_id" uuid NOT NULL,
	"equivalence" text DEFAULT 'equivalent' NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_set_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code_system_id" uuid NOT NULL,
	"version" text NOT NULL,
	"effective_date" date,
	"is_active" boolean DEFAULT false NOT NULL,
	"total_codes" integer DEFAULT 0 NOT NULL,
	"deprecated_codes" integer DEFAULT 0 NOT NULL,
	"imported_by" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL UNIQUE,
	"oid" text,
	"description" text,
	"current_version_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code_system_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"replaced_by_code_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_data_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"catalog_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_data_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"catalog_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"attributes" jsonb DEFAULT '{}',
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"replaced_by_item_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_module_action_unique" ON "role_permissions" ("role_id","module","action");--> statement-breakpoint
CREATE INDEX "roles_facility_id_idx" ON "roles" ("facility_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_user_id_idx" ON "staff_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_facility_id_idx" ON "staff_profiles" ("facility_id");--> statement-breakpoint
CREATE INDEX "user_roles_staff_profile_id_idx" ON "user_roles" ("staff_profile_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_staff_role_unique" ON "user_roles" ("staff_profile_id","role_id");--> statement-breakpoint
CREATE INDEX "bed_census_snapshots_facility_date_idx" ON "bed_census_snapshots" ("facility_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "bed_status_history_bed_id_idx" ON "bed_status_history" ("bed_id");--> statement-breakpoint
CREATE INDEX "bed_status_history_changed_at_idx" ON "bed_status_history" ("changed_at");--> statement-breakpoint
CREATE INDEX "beds_ward_id_idx" ON "beds" ("ward_id");--> statement-breakpoint
CREATE INDEX "beds_facility_id_idx" ON "beds" ("facility_id");--> statement-breakpoint
CREATE INDEX "beds_status_idx" ON "beds" ("status");--> statement-breakpoint
CREATE INDEX "encounter_status_events_facility_id_idx" ON "encounter_status_events" ("facility_id");--> statement-breakpoint
CREATE INDEX "encounter_status_events_encounter_id_idx" ON "encounter_status_events" ("encounter_id");--> statement-breakpoint
CREATE INDEX "encounter_status_events_workflow_type_idx" ON "encounter_status_events" ("workflow_type");--> statement-breakpoint
CREATE INDEX "encounter_status_events_occurred_at_idx" ON "encounter_status_events" ("occurred_at");--> statement-breakpoint
CREATE INDEX "encounter_status_events_is_escalated_idx" ON "encounter_status_events" ("is_escalated");--> statement-breakpoint
CREATE INDEX "encounter_transfers_encounter_id_idx" ON "encounter_transfers" ("encounter_id");--> statement-breakpoint
CREATE INDEX "encounter_transfers_facility_id_idx" ON "encounter_transfers" ("facility_id");--> statement-breakpoint
CREATE INDEX "encounters_facility_id_idx" ON "encounters" ("facility_id");--> statement-breakpoint
CREATE INDEX "encounters_patient_id_idx" ON "encounters" ("patient_id");--> statement-breakpoint
CREATE INDEX "encounters_status_idx" ON "encounters" ("status");--> statement-breakpoint
CREATE INDEX "encounters_admission_datetime_idx" ON "encounters" ("admission_datetime");--> statement-breakpoint
CREATE INDEX "opd_triage_intakes_facility_id_idx" ON "opd_triage_intakes" ("facility_id");--> statement-breakpoint
CREATE INDEX "opd_triage_intakes_patient_id_idx" ON "opd_triage_intakes" ("patient_id");--> statement-breakpoint
CREATE INDEX "opd_triage_intakes_status_idx" ON "opd_triage_intakes" ("status");--> statement-breakpoint
CREATE INDEX "patients_facility_id_idx" ON "patients" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_mrn_facility_uniq" ON "patients" ("mrn","facility_id");--> statement-breakpoint
CREATE INDEX "patients_name_idx" ON "patients" ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "pre_encounters_facility_id_idx" ON "pre_encounters" ("facility_id");--> statement-breakpoint
CREATE INDEX "pre_encounters_status_idx" ON "pre_encounters" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pre_encounters_facility_trauma_alias_uniq" ON "pre_encounters" ("facility_id","trauma_alias");--> statement-breakpoint
CREATE INDEX "wards_facility_id_idx" ON "wards" ("facility_id");--> statement-breakpoint
CREATE INDEX "allergies_patient_id_idx" ON "allergies" ("patient_id");--> statement-breakpoint
CREATE INDEX "allergies_facility_id_idx" ON "allergies" ("facility_id");--> statement-breakpoint
CREATE INDEX "allergies_allergen_type_idx" ON "allergies" ("allergen_type");--> statement-breakpoint
CREATE INDEX "clinical_notes_facility_id_idx" ON "clinical_notes" ("facility_id");--> statement-breakpoint
CREATE INDEX "clinical_notes_encounter_id_idx" ON "clinical_notes" ("encounter_id");--> statement-breakpoint
CREATE INDEX "clinical_notes_pre_encounter_id_idx" ON "clinical_notes" ("pre_encounter_id");--> statement-breakpoint
CREATE INDEX "clinical_notes_status_idx" ON "clinical_notes" ("status");--> statement-breakpoint
CREATE INDEX "consent_records_encounter_id_idx" ON "consent_records" ("encounter_id");--> statement-breakpoint
CREATE INDEX "consent_records_patient_id_idx" ON "consent_records" ("patient_id");--> statement-breakpoint
CREATE INDEX "consent_records_facility_id_idx" ON "consent_records" ("facility_id");--> statement-breakpoint
CREATE INDEX "consent_records_consent_type_idx" ON "consent_records" ("consent_type");--> statement-breakpoint
CREATE INDEX "medical_records_requests_facility_id_idx" ON "medical_records_requests" ("facility_id");--> statement-breakpoint
CREATE INDEX "medical_records_requests_patient_id_idx" ON "medical_records_requests" ("patient_id");--> statement-breakpoint
CREATE INDEX "medical_records_requests_status_idx" ON "medical_records_requests" ("status");--> statement-breakpoint
CREATE INDEX "medical_records_requests_request_type_idx" ON "medical_records_requests" ("request_type");--> statement-breakpoint
CREATE INDEX "note_addenda_note_id_idx" ON "note_addenda" ("note_id");--> statement-breakpoint
CREATE INDEX "note_templates_facility_id_idx" ON "note_templates" ("facility_id");--> statement-breakpoint
CREATE INDEX "note_templates_category_idx" ON "note_templates" ("category");--> statement-breakpoint
CREATE INDEX "problems_patient_id_idx" ON "problems" ("patient_id");--> statement-breakpoint
CREATE INDEX "problems_facility_id_idx" ON "problems" ("facility_id");--> statement-breakpoint
CREATE INDEX "problems_status_idx" ON "problems" ("status");--> statement-breakpoint
CREATE INDEX "problems_encounter_id_idx" ON "problems" ("encounter_id");--> statement-breakpoint
CREATE INDEX "catalog_versions_catalog_type_idx" ON "catalog_versions" ("catalog_type");--> statement-breakpoint
CREATE INDEX "catalog_versions_published_at_idx" ON "catalog_versions" ("published_at");--> statement-breakpoint
CREATE INDEX "code_set_catalog_uploads_catalog_type_idx" ON "code_set_catalog_uploads" ("catalog_type");--> statement-breakpoint
CREATE INDEX "code_set_catalog_uploads_created_at_idx" ON "code_set_catalog_uploads" ("created_at");--> statement-breakpoint
CREATE INDEX "deprecated_code_mappings_catalog_type_idx" ON "deprecated_code_mappings" ("catalog_type");--> statement-breakpoint
CREATE INDEX "deprecated_code_mappings_from_code_idx" ON "deprecated_code_mappings" ("from_code");--> statement-breakpoint
CREATE INDEX "drug_brands_drug_generic_id_idx" ON "drug_brands" ("drug_generic_id");--> statement-breakpoint
CREATE INDEX "drug_brands_brand_name_idx" ON "drug_brands" ("brand_name");--> statement-breakpoint
CREATE INDEX "drug_generics_generic_name_idx" ON "drug_generics" ("generic_name");--> statement-breakpoint
CREATE INDEX "drug_generics_rxnorm_code_idx" ON "drug_generics" ("rxnorm_code");--> statement-breakpoint
CREATE INDEX "formulary_items_facility_id_idx" ON "formulary_items" ("facility_id");--> statement-breakpoint
CREATE INDEX "formulary_items_drug_generic_id_idx" ON "formulary_items" ("drug_generic_id");--> statement-breakpoint
CREATE INDEX "icd10_codes_code_idx" ON "icd10_codes" ("code");--> statement-breakpoint
CREATE INDEX "icd10_codes_description_idx" ON "icd10_codes" ("description");--> statement-breakpoint
CREATE INDEX "loinc_codes_loinc_num_idx" ON "loinc_codes" ("loinc_num");--> statement-breakpoint
CREATE INDEX "loinc_codes_long_common_name_idx" ON "loinc_codes" ("long_common_name");--> statement-breakpoint
CREATE INDEX "rvs_codes_rvs_code_idx" ON "rvs_codes" ("rvs_code");--> statement-breakpoint
CREATE INDEX "rvs_codes_procedure_name_idx" ON "rvs_codes" ("procedure_name");--> statement-breakpoint
CREATE INDEX "rxnorm_codes_rxcui_idx" ON "rxnorm_codes" ("rxcui");--> statement-breakpoint
CREATE INDEX "rxnorm_codes_name_idx" ON "rxnorm_codes" ("name");--> statement-breakpoint
CREATE INDEX "snomed_ct_codes_concept_id_idx" ON "snomed_ct_codes" ("concept_id");--> statement-breakpoint
CREATE INDEX "snomed_ct_codes_preferred_term_idx" ON "snomed_ct_codes" ("preferred_term");--> statement-breakpoint
CREATE INDEX "snomed_ct_codes_semantic_tag_idx" ON "snomed_ct_codes" ("semantic_tag");--> statement-breakpoint
CREATE INDEX "counseling_logs_facility_id_idx" ON "counseling_logs" ("facility_id");--> statement-breakpoint
CREATE INDEX "counseling_logs_encounter_id_idx" ON "counseling_logs" ("encounter_id");--> statement-breakpoint
CREATE INDEX "counseling_logs_medication_order_id_idx" ON "counseling_logs" ("medication_order_id");--> statement-breakpoint
CREATE INDEX "counseling_logs_counseled_at_idx" ON "counseling_logs" ("counseled_at");--> statement-breakpoint
CREATE INDEX "dispense_logs_medication_order_id_idx" ON "dispense_logs" ("medication_order_id");--> statement-breakpoint
CREATE INDEX "dispense_logs_facility_id_idx" ON "dispense_logs" ("facility_id");--> statement-breakpoint
CREATE INDEX "dispense_logs_patient_id_idx" ON "dispense_logs" ("patient_id");--> statement-breakpoint
CREATE INDEX "dispense_logs_dispensed_at_idx" ON "dispense_logs" ("dispensed_at");--> statement-breakpoint
CREATE INDEX "high_alert_verifications_medication_order_id_idx" ON "high_alert_verifications" ("medication_order_id");--> statement-breakpoint
CREATE INDEX "high_alert_verifications_verifying_staff_id_idx" ON "high_alert_verifications" ("verifying_staff_id");--> statement-breakpoint
CREATE INDEX "imaging_orders_facility_id_idx" ON "imaging_orders" ("facility_id");--> statement-breakpoint
CREATE INDEX "imaging_orders_encounter_id_idx" ON "imaging_orders" ("encounter_id");--> statement-breakpoint
CREATE INDEX "imaging_orders_status_idx" ON "imaging_orders" ("status");--> statement-breakpoint
CREATE INDEX "lab_orders_facility_id_idx" ON "lab_orders" ("facility_id");--> statement-breakpoint
CREATE INDEX "lab_orders_encounter_id_idx" ON "lab_orders" ("encounter_id");--> statement-breakpoint
CREATE INDEX "lab_orders_status_idx" ON "lab_orders" ("status");--> statement-breakpoint
CREATE INDEX "medication_orders_facility_id_idx" ON "medication_orders" ("facility_id");--> statement-breakpoint
CREATE INDEX "medication_orders_encounter_id_idx" ON "medication_orders" ("encounter_id");--> statement-breakpoint
CREATE INDEX "medication_orders_pre_encounter_id_idx" ON "medication_orders" ("pre_encounter_id");--> statement-breakpoint
CREATE INDEX "medication_orders_status_idx" ON "medication_orders" ("status");--> statement-breakpoint
CREATE INDEX "order_verifications_medication_order_id_idx" ON "order_verifications" ("medication_order_id");--> statement-breakpoint
CREATE INDEX "order_verifications_pharmacist_staff_id_idx" ON "order_verifications" ("pharmacist_staff_id");--> statement-breakpoint
CREATE INDEX "prescriptions_facility_id_idx" ON "prescriptions" ("facility_id");--> statement-breakpoint
CREATE INDEX "prescriptions_encounter_id_idx" ON "prescriptions" ("encounter_id");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions" ("patient_id");--> statement-breakpoint
CREATE INDEX "flowsheet_entries_encounter_id_idx" ON "flowsheet_entries" ("encounter_id");--> statement-breakpoint
CREATE INDEX "flowsheet_entries_facility_id_idx" ON "flowsheet_entries" ("facility_id");--> statement-breakpoint
CREATE INDEX "flowsheet_entries_recorded_at_idx" ON "flowsheet_entries" ("recorded_at");--> statement-breakpoint
CREATE INDEX "hai_tags_encounter_id_idx" ON "hai_tags" ("encounter_id");--> statement-breakpoint
CREATE INDEX "hai_tags_facility_id_idx" ON "hai_tags" ("facility_id");--> statement-breakpoint
CREATE INDEX "hai_tags_hai_type_idx" ON "hai_tags" ("hai_type");--> statement-breakpoint
CREATE INDEX "io_entries_facility_id_idx" ON "io_entries" ("facility_id");--> statement-breakpoint
CREATE INDEX "io_entries_encounter_id_idx" ON "io_entries" ("encounter_id");--> statement-breakpoint
CREATE INDEX "io_entries_recorded_at_idx" ON "io_entries" ("recorded_at");--> statement-breakpoint
CREATE INDEX "mar_entries_facility_id_idx" ON "mar_entries" ("facility_id");--> statement-breakpoint
CREATE INDEX "mar_entries_encounter_id_idx" ON "mar_entries" ("encounter_id");--> statement-breakpoint
CREATE INDEX "mar_entries_medication_order_id_idx" ON "mar_entries" ("medication_order_id");--> statement-breakpoint
CREATE INDEX "mar_entries_scheduled_time_idx" ON "mar_entries" ("scheduled_time");--> statement-breakpoint
CREATE INDEX "shift_handoffs_encounter_id_idx" ON "shift_handoffs" ("encounter_id");--> statement-breakpoint
CREATE INDEX "shift_handoffs_facility_id_idx" ON "shift_handoffs" ("facility_id");--> statement-breakpoint
CREATE INDEX "tar_entries_facility_id_idx" ON "tar_entries" ("facility_id");--> statement-breakpoint
CREATE INDEX "tar_entries_encounter_id_idx" ON "tar_entries" ("encounter_id");--> statement-breakpoint
CREATE INDEX "vital_signs_facility_id_idx" ON "vital_signs" ("facility_id");--> statement-breakpoint
CREATE INDEX "vital_signs_encounter_id_idx" ON "vital_signs" ("encounter_id");--> statement-breakpoint
CREATE INDEX "vital_signs_pre_encounter_id_idx" ON "vital_signs" ("pre_encounter_id");--> statement-breakpoint
CREATE INDEX "vital_signs_recorded_at_idx" ON "vital_signs" ("recorded_at");--> statement-breakpoint
CREATE INDEX "cf4_claims_facility_id_idx" ON "cf4_claims" ("facility_id");--> statement-breakpoint
CREATE INDEX "cf4_claims_encounter_id_idx" ON "cf4_claims" ("encounter_id");--> statement-breakpoint
CREATE INDEX "cf4_claims_status_idx" ON "cf4_claims" ("status");--> statement-breakpoint
CREATE INDEX "cf5_claims_facility_id_idx" ON "cf5_claims" ("facility_id");--> statement-breakpoint
CREATE INDEX "cf5_claims_encounter_id_idx" ON "cf5_claims" ("encounter_id");--> statement-breakpoint
CREATE INDEX "cf5_claims_cf4_claim_id_idx" ON "cf5_claims" ("cf4_claim_id");--> statement-breakpoint
CREATE INDEX "cf5_claims_status_idx" ON "cf5_claims" ("status");--> statement-breakpoint
CREATE INDEX "charge_master_items_facility_id_idx" ON "charge_master_items" ("facility_id");--> statement-breakpoint
CREATE INDEX "charge_master_items_item_code_idx" ON "charge_master_items" ("item_code");--> statement-breakpoint
CREATE INDEX "charges_facility_id_idx" ON "charges" ("facility_id");--> statement-breakpoint
CREATE INDEX "charges_encounter_id_idx" ON "charges" ("encounter_id");--> statement-breakpoint
CREATE INDEX "eligibility_checks_patient_id_idx" ON "eligibility_checks" ("patient_id");--> statement-breakpoint
CREATE INDEX "eligibility_checks_facility_id_idx" ON "eligibility_checks" ("facility_id");--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_facility_id_idx" ON "invoices" ("facility_id");--> statement-breakpoint
CREATE INDEX "invoices_encounter_id_idx" ON "invoices" ("encounter_id");--> statement-breakpoint
CREATE INDEX "invoices_patient_id_idx" ON "invoices" ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_facility_invoice_number_uniq" ON "invoices" ("facility_id","invoice_number");--> statement-breakpoint
CREATE INDEX "payments_facility_id_idx" ON "payments" ("facility_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" ("invoice_id");--> statement-breakpoint
CREATE INDEX "ahsr_snapshots_facility_id_idx" ON "ahsr_snapshots" ("facility_id");--> statement-breakpoint
CREATE INDEX "ahsr_snapshots_year_month_idx" ON "ahsr_snapshots" ("report_year","report_month");--> statement-breakpoint
CREATE INDEX "fhir_exports_facility_id_idx" ON "fhir_exports" ("facility_id");--> statement-breakpoint
CREATE INDEX "fhir_exports_submission_status_idx" ON "fhir_exports" ("submission_status");--> statement-breakpoint
CREATE INDEX "fhir_exports_created_at_idx" ON "fhir_exports" ("created_at");--> statement-breakpoint
CREATE INDEX "pidsr_cases_facility_id_idx" ON "pidsr_cases" ("facility_id");--> statement-breakpoint
CREATE INDEX "pidsr_cases_patient_id_idx" ON "pidsr_cases" ("patient_id");--> statement-breakpoint
CREATE INDEX "pidsr_cases_disease_code_idx" ON "pidsr_cases" ("disease_code");--> statement-breakpoint
CREATE INDEX "pidsr_cases_report_status_idx" ON "pidsr_cases" ("report_status");--> statement-breakpoint
CREATE INDEX "surveillance_flags_facility_id_idx" ON "surveillance_flags" ("facility_id");--> statement-breakpoint
CREATE INDEX "surveillance_flags_encounter_id_idx" ON "surveillance_flags" ("encounter_id");--> statement-breakpoint
CREATE INDEX "surveillance_flags_is_reviewed_idx" ON "surveillance_flags" ("is_reviewed");--> statement-breakpoint
CREATE INDEX "audit_logs_facility_id_idx" ON "audit_logs" ("facility_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_id_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "break_glass_events_facility_id_idx" ON "break_glass_events" ("facility_id");--> statement-breakpoint
CREATE INDEX "break_glass_events_clinician_staff_id_idx" ON "break_glass_events" ("clinician_staff_id");--> statement-breakpoint
CREATE INDEX "break_glass_events_patient_id_idx" ON "break_glass_events" ("patient_id");--> statement-breakpoint
CREATE INDEX "break_glass_events_review_status_idx" ON "break_glass_events" ("review_status");--> statement-breakpoint
CREATE INDEX "data_exports_facility_id_idx" ON "data_exports" ("facility_id");--> statement-breakpoint
CREATE INDEX "data_exports_actor_user_id_idx" ON "data_exports" ("actor_user_id");--> statement-breakpoint
CREATE INDEX "data_exports_exported_at_idx" ON "data_exports" ("exported_at");--> statement-breakpoint
CREATE INDEX "data_exports_entity_type_idx" ON "data_exports" ("entity_type");--> statement-breakpoint
CREATE INDEX "notifications_facility_id_idx" ON "notifications" ("facility_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_staff_id_idx" ON "notifications" ("recipient_staff_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX "anesthesia_records_facility_id_idx" ON "anesthesia_records" ("facility_id");--> statement-breakpoint
CREATE INDEX "anesthesia_records_surgical_case_id_idx" ON "anesthesia_records" ("surgical_case_id");--> statement-breakpoint
CREATE INDEX "anesthesia_records_operation_record_id_idx" ON "anesthesia_records" ("operation_record_id");--> statement-breakpoint
CREATE INDEX "anesthesia_records_encounter_id_idx" ON "anesthesia_records" ("encounter_id");--> statement-breakpoint
CREATE INDEX "anesthesia_records_anesthesiologist_staff_id_idx" ON "anesthesia_records" ("anesthesiologist_staff_id");--> statement-breakpoint
CREATE INDEX "operation_records_facility_id_idx" ON "operation_records" ("facility_id");--> statement-breakpoint
CREATE INDEX "operation_records_surgical_case_id_idx" ON "operation_records" ("surgical_case_id");--> statement-breakpoint
CREATE INDEX "operation_records_encounter_id_idx" ON "operation_records" ("encounter_id");--> statement-breakpoint
CREATE INDEX "operation_records_surgeon_staff_id_idx" ON "operation_records" ("surgeon_staff_id");--> statement-breakpoint
CREATE INDEX "operation_records_status_idx" ON "operation_records" ("status");--> statement-breakpoint
CREATE INDEX "surgical_cases_facility_id_idx" ON "surgical_cases" ("facility_id");--> statement-breakpoint
CREATE INDEX "surgical_cases_encounter_id_idx" ON "surgical_cases" ("encounter_id");--> statement-breakpoint
CREATE INDEX "surgical_cases_patient_id_idx" ON "surgical_cases" ("patient_id");--> statement-breakpoint
CREATE INDEX "surgical_cases_surgeon_staff_id_idx" ON "surgical_cases" ("surgeon_staff_id");--> statement-breakpoint
CREATE INDEX "surgical_cases_status_idx" ON "surgical_cases" ("status");--> statement-breakpoint
CREATE INDEX "surgical_cases_scheduled_datetime_idx" ON "surgical_cases" ("scheduled_datetime");--> statement-breakpoint
CREATE INDEX "surgical_checklists_facility_id_idx" ON "surgical_checklists" ("facility_id");--> statement-breakpoint
CREATE INDEX "surgical_checklists_surgical_case_id_idx" ON "surgical_checklists" ("surgical_case_id");--> statement-breakpoint
CREATE INDEX "surgical_checklists_encounter_id_idx" ON "surgical_checklists" ("encounter_id");--> statement-breakpoint
CREATE INDEX "surgical_checklists_operation_record_id_idx" ON "surgical_checklists" ("operation_record_id");--> statement-breakpoint
CREATE INDEX "surgical_rvs_assignments_facility_id_idx" ON "surgical_rvs_assignments" ("facility_id");--> statement-breakpoint
CREATE INDEX "surgical_rvs_assignments_surgical_case_id_idx" ON "surgical_rvs_assignments" ("surgical_case_id");--> statement-breakpoint
CREATE INDEX "surgical_rvs_assignments_operation_record_id_idx" ON "surgical_rvs_assignments" ("operation_record_id");--> statement-breakpoint
CREATE INDEX "surgical_rvs_assignments_status_idx" ON "surgical_rvs_assignments" ("status");--> statement-breakpoint
CREATE INDEX "appointments_facility_id_idx" ON "appointments" ("facility_id");--> statement-breakpoint
CREATE INDEX "appointments_patient_id_idx" ON "appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_clinician_staff_id_idx" ON "appointments" ("clinician_staff_id");--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" ("appointment_date");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_clinician_date_time_uniq" ON "appointments" ("clinician_staff_id","appointment_date","appointment_time");--> statement-breakpoint
CREATE INDEX "clinic_templates_facility_id_idx" ON "clinic_templates" ("facility_id");--> statement-breakpoint
CREATE INDEX "clinic_templates_clinician_staff_id_idx" ON "clinic_templates" ("clinician_staff_id");--> statement-breakpoint
CREATE INDEX "clinic_templates_day_of_week_idx" ON "clinic_templates" ("day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_templates_clinician_day_uniq" ON "clinic_templates" ("clinician_staff_id","day_of_week","clinic_name");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_facility_id_idx" ON "nbs_log_entries" ("facility_id");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_encounter_id_idx" ON "nbs_log_entries" ("encounter_id");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_patient_id_idx" ON "nbs_log_entries" ("patient_id");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_mother_patient_id_idx" ON "nbs_log_entries" ("mother_patient_id");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_status_idx" ON "nbs_log_entries" ("status");--> statement-breakpoint
CREATE INDEX "nbs_log_entries_screening_datetime_idx" ON "nbs_log_entries" ("screening_datetime");--> statement-breakpoint
CREATE INDEX "death_reports_facility_id_idx" ON "death_reports" ("facility_id");--> statement-breakpoint
CREATE INDEX "death_reports_encounter_id_idx" ON "death_reports" ("encounter_id");--> statement-breakpoint
CREATE INDEX "death_reports_patient_id_idx" ON "death_reports" ("patient_id");--> statement-breakpoint
CREATE INDEX "death_reports_report_type_idx" ON "death_reports" ("report_type");--> statement-breakpoint
CREATE INDEX "death_reports_status_idx" ON "death_reports" ("status");--> statement-breakpoint
CREATE INDEX "death_reports_death_datetime_idx" ON "death_reports" ("death_datetime");--> statement-breakpoint
CREATE INDEX "birth_registrations_facility_id_idx" ON "birth_registrations" ("facility_id");--> statement-breakpoint
CREATE INDEX "birth_registrations_patient_id_idx" ON "birth_registrations" ("patient_id");--> statement-breakpoint
CREATE INDEX "birth_registrations_status_idx" ON "birth_registrations" ("status");--> statement-breakpoint
CREATE INDEX "birth_registrations_birth_datetime_idx" ON "birth_registrations" ("birth_datetime");--> statement-breakpoint
CREATE INDEX "nutrition_assessments_facility_id_idx" ON "nutrition_assessments" ("facility_id");--> statement-breakpoint
CREATE INDEX "nutrition_assessments_encounter_id_idx" ON "nutrition_assessments" ("encounter_id");--> statement-breakpoint
CREATE INDEX "nutrition_assessments_patient_id_idx" ON "nutrition_assessments" ("patient_id");--> statement-breakpoint
CREATE INDEX "nutrition_assessments_status_idx" ON "nutrition_assessments" ("status");--> statement-breakpoint
CREATE INDEX "nutrition_assessments_malnutrition_risk_idx" ON "nutrition_assessments" ("malnutrition_risk");--> statement-breakpoint
CREATE INDEX "msw_evaluations_facility_id_idx" ON "msw_evaluations" ("facility_id");--> statement-breakpoint
CREATE INDEX "msw_evaluations_encounter_id_idx" ON "msw_evaluations" ("encounter_id");--> statement-breakpoint
CREATE INDEX "msw_evaluations_patient_id_idx" ON "msw_evaluations" ("patient_id");--> statement-breakpoint
CREATE INDEX "msw_evaluations_status_idx" ON "msw_evaluations" ("status");--> statement-breakpoint
CREATE INDEX "msw_evaluations_coe_program_idx" ON "msw_evaluations" ("coe_program");--> statement-breakpoint
CREATE INDEX "telemedicine_abstracts_encounter_id_idx" ON "telemedicine_abstracts" ("encounter_id");--> statement-breakpoint
CREATE INDEX "telemedicine_abstracts_patient_id_idx" ON "telemedicine_abstracts" ("patient_id");--> statement-breakpoint
CREATE INDEX "telemedicine_abstracts_status_idx" ON "telemedicine_abstracts" ("status");--> statement-breakpoint
CREATE INDEX "telemedicine_appts_facility_id_idx" ON "telemedicine_appointments" ("facility_id");--> statement-breakpoint
CREATE INDEX "telemedicine_appts_patient_id_idx" ON "telemedicine_appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX "telemedicine_appts_clinician_staff_id_idx" ON "telemedicine_appointments" ("clinician_staff_id");--> statement-breakpoint
CREATE INDEX "telemedicine_appts_scheduled_date_idx" ON "telemedicine_appointments" ("scheduled_date");--> statement-breakpoint
CREATE INDEX "telemedicine_appts_status_idx" ON "telemedicine_appointments" ("status");--> statement-breakpoint
CREATE INDEX "telemedicine_encounters_appointment_id_idx" ON "telemedicine_encounters" ("appointment_id");--> statement-breakpoint
CREATE INDEX "telemedicine_encounters_patient_id_idx" ON "telemedicine_encounters" ("patient_id");--> statement-breakpoint
CREATE INDEX "telemedicine_encounters_clinician_staff_id_idx" ON "telemedicine_encounters" ("clinician_staff_id");--> statement-breakpoint
CREATE INDEX "telemedicine_encounters_status_idx" ON "telemedicine_encounters" ("status");--> statement-breakpoint
CREATE INDEX "telemedicine_prescription_items_prescription_id_idx" ON "telemedicine_prescription_items" ("prescription_id");--> statement-breakpoint
CREATE INDEX "telemedicine_prescriptions_encounter_id_idx" ON "telemedicine_prescriptions" ("encounter_id");--> statement-breakpoint
CREATE INDEX "telemedicine_prescriptions_appointment_id_idx" ON "telemedicine_prescriptions" ("appointment_id");--> statement-breakpoint
CREATE INDEX "telemedicine_prescriptions_status_idx" ON "telemedicine_prescriptions" ("status");--> statement-breakpoint
CREATE INDEX "fft_flag_id_idx" ON "feature_flag_targets" ("flag_id");--> statement-breakpoint
CREATE INDEX "fft_environment_idx" ON "feature_flag_targets" ("environment");--> statement-breakpoint
CREATE INDEX "fft_facility_id_idx" ON "feature_flag_targets" ("facility_id");--> statement-breakpoint
CREATE INDEX "fft_role_id_idx" ON "feature_flag_targets" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fft_flag_env_facility_role_unique" ON "feature_flag_targets" ("flag_id","environment","facility_id","role_id");--> statement-breakpoint
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" ("key");--> statement-breakpoint
CREATE INDEX "offline_cache_jobs_facility_id_idx" ON "offline_cache_jobs" ("facility_id");--> statement-breakpoint
CREATE INDEX "offline_cache_jobs_status_idx" ON "offline_cache_jobs" ("status");--> statement-breakpoint
CREATE INDEX "offline_cache_jobs_started_at_idx" ON "offline_cache_jobs" ("started_at");--> statement-breakpoint
CREATE INDEX "integration_api_keys_integration_id_idx" ON "integration_api_keys" ("integration_id");--> statement-breakpoint
CREATE INDEX "integrations_facility_id_idx" ON "integrations" ("facility_id");--> statement-breakpoint
CREATE INDEX "integrations_kind_idx" ON "integrations" ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_facility_kind_name_unique" ON "integrations" ("facility_id","kind","name");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_integration_id_idx" ON "webhook_endpoints" ("integration_id");--> statement-breakpoint
CREATE INDEX "sla_configs_facility_id_idx" ON "sla_configs" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_configs_facility_workflow_uniq" ON "sla_configs" ("facility_id","workflow_type");--> statement-breakpoint
CREATE INDEX "sla_step_configs_facility_id_idx" ON "sla_step_configs" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_step_configs_facility_step_uniq" ON "sla_step_configs" ("facility_id","step_type");--> statement-breakpoint
CREATE INDEX "workflow_status_log_facility_id_idx" ON "workflow_status_log" ("facility_id");--> statement-breakpoint
CREATE INDEX "workflow_status_log_encounter_id_idx" ON "workflow_status_log" ("encounter_id");--> statement-breakpoint
CREATE INDEX "workflow_status_log_started_at_idx" ON "workflow_status_log" ("started_at");--> statement-breakpoint
CREATE INDEX "workflow_status_log_is_breached_idx" ON "workflow_status_log" ("is_breached");--> statement-breakpoint
CREATE INDEX "clinician_licenses_staff_profile_id_idx" ON "clinician_licenses" ("staff_profile_id");--> statement-breakpoint
CREATE INDEX "clinician_licenses_license_type_idx" ON "clinician_licenses" ("license_type");--> statement-breakpoint
CREATE INDEX "clinician_licenses_status_idx" ON "clinician_licenses" ("status");--> statement-breakpoint
CREATE INDEX "clinician_licenses_expiry_date_idx" ON "clinician_licenses" ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bed_census_daily_facility_ward_date_uniq" ON "bed_census_daily" ("facility_id","ward_id","census_date");--> statement-breakpoint
CREATE INDEX "bed_census_daily_facility_date_idx" ON "bed_census_daily" ("facility_id","census_date");--> statement-breakpoint
CREATE INDEX "fhir_endpoints_facility_id_idx" ON "fhir_endpoints" ("facility_id");--> statement-breakpoint
CREATE INDEX "fhir_exchange_log_endpoint_id_idx" ON "fhir_exchange_log" ("endpoint_id");--> statement-breakpoint
CREATE INDEX "fhir_exchange_log_facility_id_idx" ON "fhir_exchange_log" ("facility_id");--> statement-breakpoint
CREATE INDEX "fhir_exchange_log_status_idx" ON "fhir_exchange_log" ("status");--> statement-breakpoint
CREATE INDEX "fhir_exchange_log_occurred_at_idx" ON "fhir_exchange_log" ("occurred_at");--> statement-breakpoint
CREATE INDEX "code_mappings_source_code_id_idx" ON "code_mappings" ("source_code_id");--> statement-breakpoint
CREATE INDEX "code_mappings_target_code_id_idx" ON "code_mappings" ("target_code_id");--> statement-breakpoint
CREATE INDEX "code_set_versions_code_system_id_idx" ON "code_set_versions" ("code_system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "code_set_versions_system_version_uniq" ON "code_set_versions" ("code_system_id","version");--> statement-breakpoint
CREATE INDEX "codes_code_system_id_idx" ON "codes" ("code_system_id");--> statement-breakpoint
CREATE INDEX "codes_version_id_idx" ON "codes" ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "codes_system_version_code_uniq" ON "codes" ("code_system_id","version_id","code");--> statement-breakpoint
CREATE INDEX "codes_is_deprecated_idx" ON "codes" ("is_deprecated");--> statement-breakpoint
CREATE INDEX "departments_facility_id_idx" ON "departments" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_facility_name_uniq" ON "departments" ("facility_id","name");--> statement-breakpoint
CREATE INDEX "master_data_catalogs_facility_id_idx" ON "master_data_catalogs" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "master_data_catalogs_facility_type_uniq" ON "master_data_catalogs" ("facility_id","catalog_type");--> statement-breakpoint
CREATE INDEX "master_data_items_catalog_id_idx" ON "master_data_items" ("catalog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "master_data_items_catalog_code_uniq" ON "master_data_items" ("catalog_id","code");--> statement-breakpoint
CREATE INDEX "master_data_items_is_deprecated_idx" ON "master_data_items" ("is_deprecated");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_staff_profile_id_staff_profiles_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bed_census_snapshots" ADD CONSTRAINT "bed_census_snapshots_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bed_census_snapshots" ADD CONSTRAINT "bed_census_snapshots_ward_id_wards_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "bed_status_history" ADD CONSTRAINT "bed_status_history_bed_id_beds_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bed_status_history" ADD CONSTRAINT "bed_status_history_changed_by_staff_profiles_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_encounter_id_encounters_id_fkey" FOREIGN KEY ("current_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_status_events" ADD CONSTRAINT "encounter_status_events_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "encounter_status_events" ADD CONSTRAINT "encounter_status_events_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "encounter_status_events" ADD CONSTRAINT "encounter_status_events_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_from_ward_id_wards_id_fkey" FOREIGN KEY ("from_ward_id") REFERENCES "wards"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_from_bed_id_beds_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_to_ward_id_wards_id_fkey" FOREIGN KEY ("to_ward_id") REFERENCES "wards"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_to_bed_id_beds_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounter_transfers" ADD CONSTRAINT "encounter_transfers_ordering_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("ordering_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_admitting_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("admitting_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_attending_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("attending_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_bed_id_beds_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_merged_from_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("merged_from_pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_linked_encounter_id_encounters_id_fkey" FOREIGN KEY ("linked_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "opd_triage_intakes" ADD CONSTRAINT "opd_triage_intakes_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "opd_triage_intakes" ADD CONSTRAINT "opd_triage_intakes_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "opd_triage_intakes" ADD CONSTRAINT "opd_triage_intakes_triage_nurse_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("triage_nurse_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "opd_triage_intakes" ADD CONSTRAINT "opd_triage_intakes_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "pre_encounters" ADD CONSTRAINT "pre_encounters_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "pre_encounters" ADD CONSTRAINT "pre_encounters_triage_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("triage_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "pre_encounters" ADD CONSTRAINT "pre_encounters_merged_to_encounter_id_encounters_id_fkey" FOREIGN KEY ("merged_to_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_documenting_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("documenting_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_template_id_note_templates_id_fkey" FOREIGN KEY ("template_id") REFERENCES "note_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("author_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_witness_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("witness_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_captured_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("captured_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medical_records_requests" ADD CONSTRAINT "medical_records_requests_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medical_records_requests" ADD CONSTRAINT "medical_records_requests_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medical_records_requests" ADD CONSTRAINT "medical_records_requests_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medical_records_requests" ADD CONSTRAINT "medical_records_requests_Jv1QrzGLGYBh_fkey" FOREIGN KEY ("processed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medical_records_requests" ADD CONSTRAINT "medical_records_requests_rc07Uogehi7O_fkey" FOREIGN KEY ("released_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "note_addenda" ADD CONSTRAINT "note_addenda_note_id_clinical_notes_id_fkey" FOREIGN KEY ("note_id") REFERENCES "clinical_notes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_addenda" ADD CONSTRAINT "note_addenda_author_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("author_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "note_templates" ADD CONSTRAINT "note_templates_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_templates" ADD CONSTRAINT "note_templates_created_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_documenting_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("documenting_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "drug_brands" ADD CONSTRAINT "drug_brands_drug_generic_id_drug_generics_id_fkey" FOREIGN KEY ("drug_generic_id") REFERENCES "drug_generics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "formulary_items" ADD CONSTRAINT "formulary_items_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "formulary_items" ADD CONSTRAINT "formulary_items_drug_generic_id_drug_generics_id_fkey" FOREIGN KEY ("drug_generic_id") REFERENCES "drug_generics"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "formulary_items" ADD CONSTRAINT "formulary_items_drug_brand_id_drug_brands_id_fkey" FOREIGN KEY ("drug_brand_id") REFERENCES "drug_brands"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_medication_order_id_medication_orders_id_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_pharmacist_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("pharmacist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "dispense_logs" ADD CONSTRAINT "dispense_logs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "dispense_logs" ADD CONSTRAINT "dispense_logs_medication_order_id_medication_orders_id_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "dispense_logs" ADD CONSTRAINT "dispense_logs_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "dispense_logs" ADD CONSTRAINT "dispense_logs_pharmacist_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("pharmacist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "high_alert_verifications" ADD CONSTRAINT "high_alert_verifications_aGclyzh1rBFh_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "high_alert_verifications" ADD CONSTRAINT "high_alert_verifications_Q628tFYl6KMJ_fkey" FOREIGN KEY ("requesting_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "high_alert_verifications" ADD CONSTRAINT "high_alert_verifications_OYp88lUS8del_fkey" FOREIGN KEY ("verifying_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_ordering_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("ordering_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordering_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("ordering_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_formulary_item_id_formulary_items_id_fkey" FOREIGN KEY ("formulary_item_id") REFERENCES "formulary_items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_parent_order_id_medication_orders_id_fkey" FOREIGN KEY ("parent_order_id") REFERENCES "medication_orders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_ordering_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("ordering_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order_verifications" ADD CONSTRAINT "order_verifications_PJwm3IzpRIlq_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_verifications" ADD CONSTRAINT "order_verifications_pharmacist_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("pharmacist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medication_order_id_medication_orders_id_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescriber_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("prescriber_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "flowsheet_entries" ADD CONSTRAINT "flowsheet_entries_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "flowsheet_entries" ADD CONSTRAINT "flowsheet_entries_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "flowsheet_entries" ADD CONSTRAINT "flowsheet_entries_recorded_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "hai_tags" ADD CONSTRAINT "hai_tags_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "hai_tags" ADD CONSTRAINT "hai_tags_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "hai_tags" ADD CONSTRAINT "hai_tags_documented_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("documented_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "io_entries" ADD CONSTRAINT "io_entries_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "io_entries" ADD CONSTRAINT "io_entries_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "io_entries" ADD CONSTRAINT "io_entries_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "io_entries" ADD CONSTRAINT "io_entries_recorded_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "mar_entries" ADD CONSTRAINT "mar_entries_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "mar_entries" ADD CONSTRAINT "mar_entries_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mar_entries" ADD CONSTRAINT "mar_entries_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "mar_entries" ADD CONSTRAINT "mar_entries_medication_order_id_medication_orders_id_fkey" FOREIGN KEY ("medication_order_id") REFERENCES "medication_orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "mar_entries" ADD CONSTRAINT "mar_entries_administered_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("administered_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_outgoing_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("outgoing_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_incoming_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("incoming_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tar_entries" ADD CONSTRAINT "tar_entries_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tar_entries" ADD CONSTRAINT "tar_entries_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tar_entries" ADD CONSTRAINT "tar_entries_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tar_entries" ADD CONSTRAINT "tar_entries_administered_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("administered_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_pre_encounter_id_pre_encounters_id_fkey" FOREIGN KEY ("pre_encounter_id") REFERENCES "pre_encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recorded_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cf4_claims" ADD CONSTRAINT "cf4_claims_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cf4_claims" ADD CONSTRAINT "cf4_claims_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cf4_claims" ADD CONSTRAINT "cf4_claims_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cf4_claims" ADD CONSTRAINT "cf4_claims_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cf5_claims" ADD CONSTRAINT "cf5_claims_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cf5_claims" ADD CONSTRAINT "cf5_claims_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cf5_claims" ADD CONSTRAINT "cf5_claims_cf4_claim_id_cf4_claims_id_fkey" FOREIGN KEY ("cf4_claim_id") REFERENCES "cf4_claims"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cf5_claims" ADD CONSTRAINT "cf5_claims_validated_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("validated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "charge_master_items" ADD CONSTRAINT "charge_master_items_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_charge_master_item_id_charge_master_items_id_fkey" FOREIGN KEY ("charge_master_item_id") REFERENCES "charge_master_items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_created_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_charge_id_charges_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("received_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ahsr_snapshots" ADD CONSTRAINT "ahsr_snapshots_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ahsr_snapshots" ADD CONSTRAINT "ahsr_snapshots_generated_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("generated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "fhir_exports" ADD CONSTRAINT "fhir_exports_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "fhir_exports" ADD CONSTRAINT "fhir_exports_initiated_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("initiated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "pidsr_cases" ADD CONSTRAINT "pidsr_cases_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "pidsr_cases" ADD CONSTRAINT "pidsr_cases_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "pidsr_cases" ADD CONSTRAINT "pidsr_cases_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "pidsr_cases" ADD CONSTRAINT "pidsr_cases_reporting_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("reporting_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surveillance_flags" ADD CONSTRAINT "surveillance_flags_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surveillance_flags" ADD CONSTRAINT "surveillance_flags_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "surveillance_flags" ADD CONSTRAINT "surveillance_flags_note_id_clinical_notes_id_fkey" FOREIGN KEY ("note_id") REFERENCES "clinical_notes"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surveillance_flags" ADD CONSTRAINT "surveillance_flags_reviewed_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_staff_profile_id_staff_profiles_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "break_glass_events" ADD CONSTRAINT "break_glass_events_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "break_glass_events" ADD CONSTRAINT "break_glass_events_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "break_glass_events" ADD CONSTRAINT "break_glass_events_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "break_glass_events" ADD CONSTRAINT "break_glass_events_reviewed_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_actor_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("recipient_staff_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_surgical_case_id_surgical_cases_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "surgical_cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_XZ6FtmG6DZp5_fkey" FOREIGN KEY ("operation_record_id") REFERENCES "operation_records"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_2FFpYIXp5Ni1_fkey" FOREIGN KEY ("anesthesiologist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_surgical_case_id_surgical_cases_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "surgical_cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_surgeon_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("surgeon_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_WrWwppDfNOCh_fkey" FOREIGN KEY ("first_assistant_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_J0IOMbl9BbAB_fkey" FOREIGN KEY ("second_assistant_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_scrub_nurse_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("scrub_nurse_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_8eQNToMdQwSh_fkey" FOREIGN KEY ("circulating_nurse_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_NbjyDTGdYlkN_fkey" FOREIGN KEY ("anesthesiologist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_signed_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("signed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_surgeon_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("surgeon_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_anesthesiologist_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("anesthesiologist_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_checklists" ADD CONSTRAINT "surgical_checklists_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surgical_checklists" ADD CONSTRAINT "surgical_checklists_surgical_case_id_surgical_cases_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "surgical_cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "surgical_checklists" ADD CONSTRAINT "surgical_checklists_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_checklists" ADD CONSTRAINT "surgical_checklists_b83X4tShQq5J_fkey" FOREIGN KEY ("operation_record_id") REFERENCES "operation_records"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_checklists" ADD CONSTRAINT "surgical_checklists_mZ2evxC52tTV_fkey" FOREIGN KEY ("completed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_aLCPDnVwJK8I_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "surgical_cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_qEf6C8e8CDn2_fkey" FOREIGN KEY ("operation_record_id") REFERENCES "operation_records"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_rvs_code_id_rvs_codes_id_fkey" FOREIGN KEY ("rvs_code_id") REFERENCES "rvs_codes"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_fxQn7HbGIe0m_fkey" FOREIGN KEY ("suggested_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_SKGbbwi149Gl_fkey" FOREIGN KEY ("validated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "surgical_rvs_assignments" ADD CONSTRAINT "surgical_rvs_assignments_A5kSf2IVEnAp_fkey" FOREIGN KEY ("finalized_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_template_id_clinic_templates_id_fkey" FOREIGN KEY ("clinic_template_id") REFERENCES "clinic_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booked_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("booked_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinic_templates" ADD CONSTRAINT "clinic_templates_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinic_templates" ADD CONSTRAINT "clinic_templates_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_mother_patient_id_patients_id_fkey" FOREIGN KEY ("mother_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_consent_record_id_consent_records_id_fkey" FOREIGN KEY ("consent_record_id") REFERENCES "consent_records"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "nbs_log_entries" ADD CONSTRAINT "nbs_log_entries_screened_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("screened_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "death_reports" ADD CONSTRAINT "death_reports_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "death_reports" ADD CONSTRAINT "death_reports_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "death_reports" ADD CONSTRAINT "death_reports_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "death_reports" ADD CONSTRAINT "death_reports_certifying_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("certifying_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "death_reports" ADD CONSTRAINT "death_reports_released_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("released_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_R97eKPy4wDiQ_fkey" FOREIGN KEY ("registered_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "birth_registrations" ADD CONSTRAINT "birth_registrations_released_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("released_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_JFppXTJCllq7_fkey" FOREIGN KEY ("assessed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "msw_evaluations" ADD CONSTRAINT "msw_evaluations_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "msw_evaluations" ADD CONSTRAINT "msw_evaluations_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "msw_evaluations" ADD CONSTRAINT "msw_evaluations_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "msw_evaluations" ADD CONSTRAINT "msw_evaluations_evaluated_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("evaluated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "msw_evaluations" ADD CONSTRAINT "msw_evaluations_approved_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("approved_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ADD CONSTRAINT "telemedicine_abstracts_R1ZV1blKs7LQ_fkey" FOREIGN KEY ("encounter_id") REFERENCES "telemedicine_encounters"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ADD CONSTRAINT "telemedicine_abstracts_cAGjwjiSc1B8_fkey" FOREIGN KEY ("appointment_id") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ADD CONSTRAINT "telemedicine_abstracts_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ADD CONSTRAINT "telemedicine_abstracts_9TQUN2ase3Yw_fkey" FOREIGN KEY ("signed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_abstracts" ADD CONSTRAINT "telemedicine_abstracts_5ehbsA5O2zFw_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_appointments" ADD CONSTRAINT "telemedicine_appointments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_appointments" ADD CONSTRAINT "telemedicine_appointments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_appointments" ADD CONSTRAINT "telemedicine_appointments_JbA07Q79FNBb_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_appointments" ADD CONSTRAINT "telemedicine_appointments_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_appointments" ADD CONSTRAINT "telemedicine_appointments_cWsRUJ4xzl3P_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ADD CONSTRAINT "telemedicine_encounters_reiiMWo1Uac5_fkey" FOREIGN KEY ("appointment_id") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ADD CONSTRAINT "telemedicine_encounters_linked_encounter_id_encounters_id_fkey" FOREIGN KEY ("linked_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ADD CONSTRAINT "telemedicine_encounters_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ADD CONSTRAINT "telemedicine_encounters_99D4n1751YWZ_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_encounters" ADD CONSTRAINT "telemedicine_encounters_8Cma5ibPEcbB_fkey" FOREIGN KEY ("signed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telemedicine_prescription_items" ADD CONSTRAINT "telemedicine_prescription_items_7opkt5LL0GvG_fkey" FOREIGN KEY ("prescription_id") REFERENCES "telemedicine_prescriptions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions" ADD CONSTRAINT "telemedicine_prescriptions_jCrjaZ3TuVW4_fkey" FOREIGN KEY ("encounter_id") REFERENCES "telemedicine_encounters"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions" ADD CONSTRAINT "telemedicine_prescriptions_87LhSNYjIw1S_fkey" FOREIGN KEY ("appointment_id") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "telemedicine_prescriptions" ADD CONSTRAINT "telemedicine_prescriptions_xjkRrxHhFLvC_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "feature_flag_targets" ADD CONSTRAINT "feature_flag_targets_flag_id_feature_flags_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feature_flag_targets" ADD CONSTRAINT "feature_flag_targets_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feature_flag_targets" ADD CONSTRAINT "feature_flag_targets_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offline_cache_jobs" ADD CONSTRAINT "offline_cache_jobs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "facility_profiles" ADD CONSTRAINT "facility_profiles_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_integration_id_integrations_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_integration_id_integrations_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sla_configs" ADD CONSTRAINT "sla_configs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sla_step_configs" ADD CONSTRAINT "sla_step_configs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workflow_status_log" ADD CONSTRAINT "workflow_status_log_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinician_licenses" ADD CONSTRAINT "clinician_licenses_staff_profile_id_staff_profiles_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bed_census_daily" ADD CONSTRAINT "bed_census_daily_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bed_census_daily" ADD CONSTRAINT "bed_census_daily_ward_id_wards_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fhir_endpoints" ADD CONSTRAINT "fhir_endpoints_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fhir_exchange_log" ADD CONSTRAINT "fhir_exchange_log_endpoint_id_fhir_endpoints_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "fhir_endpoints"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fhir_exchange_log" ADD CONSTRAINT "fhir_exchange_log_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "code_mappings" ADD CONSTRAINT "code_mappings_source_code_id_codes_id_fkey" FOREIGN KEY ("source_code_id") REFERENCES "codes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "code_mappings" ADD CONSTRAINT "code_mappings_target_code_id_codes_id_fkey" FOREIGN KEY ("target_code_id") REFERENCES "codes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "code_set_versions" ADD CONSTRAINT "code_set_versions_code_system_id_code_systems_id_fkey" FOREIGN KEY ("code_system_id") REFERENCES "code_systems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_code_system_id_code_systems_id_fkey" FOREIGN KEY ("code_system_id") REFERENCES "code_systems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_version_id_code_set_versions_id_fkey" FOREIGN KEY ("version_id") REFERENCES "code_set_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "master_data_catalogs" ADD CONSTRAINT "master_data_catalogs_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "master_data_items" ADD CONSTRAINT "master_data_items_catalog_id_master_data_catalogs_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "master_data_catalogs"("id") ON DELETE CASCADE;