CREATE TABLE IF NOT EXISTS "lcr_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"certificate_type" text NOT NULL,
	"source_record_id" uuid NOT NULL,
	"pdf_status" text DEFAULT 'pending' NOT NULL,
	"pdf_generated_at" timestamp,
	"pdf_url" text,
	"xml_status" text DEFAULT 'pending' NOT NULL,
	"xml_generated_at" timestamp,
	"xml_url" text,
	"submission_status" text DEFAULT 'not_submitted' NOT NULL,
	"submitted_at" timestamp,
	"acknowledgement_number" text,
	"reference_number" text,
	"last_submission_error" text,
	"last_submission_error_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "lcr_tracking"
	ADD CONSTRAINT "lcr_tracking_facility_id_facilities_id_fk"
	FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE restrict ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lcr_tracking_certificate_source_uniq"
	ON "lcr_tracking" USING btree ("certificate_type", "source_record_id");
CREATE INDEX IF NOT EXISTS "lcr_tracking_facility_id_idx"
	ON "lcr_tracking" USING btree ("facility_id");
CREATE INDEX IF NOT EXISTS "lcr_tracking_certificate_type_idx"
	ON "lcr_tracking" USING btree ("certificate_type");
CREATE INDEX IF NOT EXISTS "lcr_tracking_submission_status_idx"
	ON "lcr_tracking" USING btree ("submission_status");
