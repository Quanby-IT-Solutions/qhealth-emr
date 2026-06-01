CREATE TABLE IF NOT EXISTS "opd_tele_triage_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"caller_name" text NOT NULL,
	"caller_relationship" text,
	"patient_id" uuid,
	"patient_location" text NOT NULL,
	"channel_type" text NOT NULL,
	"video_link" text,
	"video_session_id" text,
	"livekit_session_started_at" timestamp with time zone,
	"livekit_session_ended_at" timestamp with time zone,
	"scheduled_arrival_time" timestamp with time zone,
	"eta_minutes" integer,
	"eta_at" timestamp with time zone,
	"chief_complaint" text NOT NULL,
	"assessment_notes" text DEFAULT '' NOT NULL,
	"provisional_acuity" text NOT NULL,
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"temperature_celsius" real,
	"heart_rate_bpm" integer,
	"respiratory_rate" integer,
	"oxygen_sat_pct" real,
	"status" text DEFAULT 'pending_arrival' NOT NULL,
	"arrived_at" timestamp with time zone,
	"linked_triage_intake_id" uuid,
	"triage_staff_id" uuid NOT NULL,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "opd_tele_triage_intakes"
	ADD CONSTRAINT "opd_tele_triage_intakes_facility_id_facilities_id_fk"
	FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "opd_tele_triage_intakes"
	ADD CONSTRAINT "opd_tele_triage_intakes_patient_id_patients_id_fk"
	FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "opd_tele_triage_intakes"
	ADD CONSTRAINT "opd_tele_triage_intakes_linked_triage_intake_id_opd_triage_intakes_id_fk"
	FOREIGN KEY ("linked_triage_intake_id") REFERENCES "opd_triage_intakes"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "opd_tele_triage_intakes"
	ADD CONSTRAINT "opd_tele_triage_intakes_triage_staff_id_staff_profiles_id_fk"
	FOREIGN KEY ("triage_staff_id") REFERENCES "staff_profiles"("id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "opd_tele_triage_intakes_facility_id_idx"
	ON "opd_tele_triage_intakes" ("facility_id");

CREATE INDEX IF NOT EXISTS "opd_tele_triage_intakes_patient_id_idx"
	ON "opd_tele_triage_intakes" ("patient_id");

CREATE INDEX IF NOT EXISTS "opd_tele_triage_intakes_status_idx"
	ON "opd_tele_triage_intakes" ("status");

CREATE INDEX IF NOT EXISTS "opd_tele_triage_intakes_eta_at_idx"
	ON "opd_tele_triage_intakes" ("eta_at");

CREATE INDEX IF NOT EXISTS "opd_tele_triage_intakes_scheduled_arrival_idx"
	ON "opd_tele_triage_intakes" ("scheduled_arrival_time");
