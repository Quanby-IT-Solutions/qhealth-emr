-- Migration: add explicit procedure mapping metadata to surgical RVS assignments
-- This supports one-to-many procedure-to-code mapping from the operative record
-- while keeping legacy rows readable.

ALTER TABLE "surgical_rvs_assignments"
	ADD COLUMN "procedure_label" text;
--> statement-breakpoint

ALTER TABLE "surgical_rvs_assignments"
	ADD COLUMN "assignment_type" text DEFAULT 'primary' NOT NULL;
--> statement-breakpoint

CREATE INDEX "surgical_rvs_assignments_procedure_label_idx"
	ON "surgical_rvs_assignments" ("procedure_label");
