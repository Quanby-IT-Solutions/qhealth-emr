CREATE TABLE "clinic_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"clinic_template_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"clinician_staff_id" uuid NOT NULL,
	"slot_date" date NOT NULL,
	"slot_start_time" time NOT NULL,
	"slot_end_time" time NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"block_reason" text,
	"appointment_id" uuid,
	"blocked_by_staff_id" uuid,
	"blocked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "clinic_slot_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_slots_clinician_date_time_uniq" ON "clinic_slots" ("clinician_staff_id","slot_date","slot_start_time");
--> statement-breakpoint
CREATE INDEX "clinic_slots_template_id_idx" ON "clinic_slots" ("clinic_template_id");
--> statement-breakpoint
CREATE INDEX "clinic_slots_slot_date_idx" ON "clinic_slots" ("slot_date");
--> statement-breakpoint
CREATE INDEX "clinic_slots_status_idx" ON "clinic_slots" ("status");
--> statement-breakpoint
CREATE INDEX "clinic_slots_facility_id_idx" ON "clinic_slots" ("facility_id");
--> statement-breakpoint
ALTER TABLE "clinic_slots" ADD CONSTRAINT "clinic_slots_clinic_template_id_clinic_templates_id_fkey" FOREIGN KEY ("clinic_template_id") REFERENCES "clinic_templates"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "clinic_slots" ADD CONSTRAINT "clinic_slots_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "clinic_slots" ADD CONSTRAINT "clinic_slots_clinician_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("clinician_staff_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "clinic_slots" ADD CONSTRAINT "clinic_slots_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "clinic_slots" ADD CONSTRAINT "clinic_slots_blocked_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("blocked_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_slot_id_clinic_slots_id_fkey" FOREIGN KEY ("clinic_slot_id") REFERENCES "clinic_slots"("id") ON DELETE SET NULL;
