CREATE TABLE "auth_lockout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL UNIQUE,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"last_failed_at" timestamp,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cews_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"encounter_id" uuid NOT NULL,
	"member_pin" text NOT NULL,
	"member_name" text,
	"status" text NOT NULL,
	"benefit_balance" numeric(14,2),
	"dependents_json" jsonb,
	"raw_response" jsonb,
	"captured_by_staff_id" uuid,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf4_status_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"claim_id" uuid NOT NULL,
	"status" text NOT NULL,
	"philhealth_ref" text,
	"payload" jsonb,
	"changed_by_staff_id" uuid,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drg_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"encounter_id" uuid NOT NULL,
	"drg_code" text NOT NULL,
	"drg_description" text,
	"confidence" numeric(5,4) NOT NULL,
	"manual_override_reason" text,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"confirmed_by_staff_id" uuid,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esoa_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"xml_uri" text,
	"pdf_uri" text,
	"sent_via" text,
	"sent_at" timestamp,
	"sent_to_recipient" text,
	"delivery_status" text,
	"generated_by_staff_id" uuid,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "konsulta_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"activity_date" date NOT NULL,
	"source_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"receipt_number" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"pdf_uri" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"issued_by_staff_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"exporter_staff_id" uuid,
	"export_format" text NOT NULL,
	"filter_snapshot" jsonb,
	"content_hash" text,
	"exported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "break_glass_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"break_glass_event_id" uuid NOT NULL,
	"reviewer_staff_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "s2_verified_until" timestamp;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD COLUMN "first_dose_at" timestamp;--> statement-breakpoint
ALTER TABLE "cf4_claims" ADD COLUMN "resubmit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount" numeric(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_type" text DEFAULT 'NONE';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_reason" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_amount" numeric(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "total_amount" numeric(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "hmo_provider" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "hmo_claim_number" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "hmo_percentage_covered" numeric(5,2);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" text DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "outcome" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "sla_configs" ADD COLUMN "hard_cap_minutes" integer;--> statement-breakpoint
ALTER TABLE "sla_step_configs" ADD COLUMN "hard_cap_minutes" integer;--> statement-breakpoint
ALTER TABLE "charges" ALTER COLUMN "created_by_staff_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "two_factors_secret_idx" ON "two_factors" ("secret");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" ("user_id");--> statement-breakpoint
CREATE INDEX "cews_snapshots_encounter_id_idx" ON "cews_snapshots" ("encounter_id");--> statement-breakpoint
CREATE INDEX "cews_snapshots_member_pin_idx" ON "cews_snapshots" ("member_pin");--> statement-breakpoint
CREATE INDEX "cf4_status_log_claim_id_idx" ON "cf4_status_log" ("claim_id");--> statement-breakpoint
CREATE INDEX "cf4_status_log_changed_at_idx" ON "cf4_status_log" ("changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "charges_source_idempotency_uniq" ON "charges" ("source_type","source_order_id","encounter_id") WHERE source_order_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "drg_mappings_encounter_id_idx" ON "drg_mappings" ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drg_mappings_encounter_id_uniq" ON "drg_mappings" ("encounter_id");--> statement-breakpoint
CREATE INDEX "esoa_statements_invoice_id_idx" ON "esoa_statements" ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "esoa_statements_invoice_version_uniq" ON "esoa_statements" ("invoice_id","version");--> statement-breakpoint
CREATE INDEX "konsulta_activities_patient_id_idx" ON "konsulta_activities" ("patient_id");--> statement-breakpoint
CREATE INDEX "konsulta_activities_facility_id_idx" ON "konsulta_activities" ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "konsulta_activities_patient_type_date_uniq" ON "konsulta_activities" ("patient_id","activity_type","activity_date");--> statement-breakpoint
CREATE INDEX "receipts_facility_id_idx" ON "receipts" ("facility_id");--> statement-breakpoint
CREATE INDEX "receipts_payment_id_idx" ON "receipts" ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_facility_fiscal_year_number_uniq" ON "receipts" ("facility_id","fiscal_year","receipt_number");--> statement-breakpoint
CREATE INDEX "audit_exports_facility_id_idx" ON "audit_exports" ("facility_id");--> statement-breakpoint
CREATE INDEX "audit_exports_exporter_staff_id_idx" ON "audit_exports" ("exporter_staff_id");--> statement-breakpoint
CREATE INDEX "audit_exports_exported_at_idx" ON "audit_exports" ("exported_at");--> statement-breakpoint
CREATE INDEX "audit_logs_session_id_idx" ON "audit_logs" ("session_id");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" ("severity");--> statement-breakpoint
CREATE INDEX "break_glass_reviews_event_id_idx" ON "break_glass_reviews" ("break_glass_event_id");--> statement-breakpoint
CREATE INDEX "break_glass_reviews_reviewer_staff_id_idx" ON "break_glass_reviews" ("reviewer_staff_id");--> statement-breakpoint
CREATE INDEX "break_glass_reviews_created_at_idx" ON "break_glass_reviews" ("created_at");--> statement-breakpoint
CREATE INDEX "codes_code_idx" ON "codes" ("code");--> statement-breakpoint
CREATE INDEX "codes_display_name_idx" ON "codes" ("display_name");--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cews_snapshots" ADD CONSTRAINT "cews_snapshots_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cews_snapshots" ADD CONSTRAINT "cews_snapshots_captured_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("captured_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cf4_status_log" ADD CONSTRAINT "cf4_status_log_claim_id_cf4_claims_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "cf4_claims"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cf4_status_log" ADD CONSTRAINT "cf4_status_log_changed_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "drg_mappings" ADD CONSTRAINT "drg_mappings_encounter_id_encounters_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "drg_mappings" ADD CONSTRAINT "drg_mappings_confirmed_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("confirmed_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "esoa_statements" ADD CONSTRAINT "esoa_statements_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "esoa_statements" ADD CONSTRAINT "esoa_statements_generated_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("generated_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "konsulta_activities" ADD CONSTRAINT "konsulta_activities_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "konsulta_activities" ADD CONSTRAINT "konsulta_activities_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issued_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("issued_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_exporter_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("exporter_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "break_glass_reviews" ADD CONSTRAINT "break_glass_reviews_9c66AlgoZndB_fkey" FOREIGN KEY ("break_glass_event_id") REFERENCES "break_glass_events"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "break_glass_reviews" ADD CONSTRAINT "break_glass_reviews_reviewer_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("reviewer_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "charges" DROP CONSTRAINT "charges_created_by_staff_id_staff_profiles_id_fkey", ADD CONSTRAINT "charges_created_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;