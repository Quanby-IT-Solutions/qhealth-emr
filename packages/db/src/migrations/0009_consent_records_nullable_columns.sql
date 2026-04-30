-- Migration: Drop NOT NULL from consent_records.captured_by_staff_id
-- Reason: The clinical-docs consent capture path (DPA consent before encounter creation)
-- does not have a designated "captured by" staff member. The nursing path still populates
-- this column. Making it nullable allows both code paths to write the same table.
ALTER TABLE "consent_records" ALTER COLUMN "captured_by_staff_id" DROP NOT NULL;
