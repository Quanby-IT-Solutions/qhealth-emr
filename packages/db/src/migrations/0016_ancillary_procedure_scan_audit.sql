ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_start_at" timestamp;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_end_at" timestamp;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_start_barcode" text;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_end_barcode" text;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_start_barcode_matched" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_end_barcode_matched" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_started_by_staff_id" uuid;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD COLUMN "procedure_ended_by_staff_id" uuid;
--> statement-breakpoint
CREATE INDEX "ancillary_clearance_procedure_start_at_idx" ON "ancillary_clearance" ("procedure_start_at");
--> statement-breakpoint
CREATE INDEX "ancillary_clearance_procedure_end_at_idx" ON "ancillary_clearance" ("procedure_end_at");
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD CONSTRAINT "ancillary_clearance_procedure_started_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("procedure_started_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "ancillary_clearance" ADD CONSTRAINT "ancillary_clearance_procedure_ended_by_staff_id_staff_profiles_id_fkey" FOREIGN KEY ("procedure_ended_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
