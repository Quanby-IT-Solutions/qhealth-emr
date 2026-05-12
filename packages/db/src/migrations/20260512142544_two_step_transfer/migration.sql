-- Flow B4: Two-step inpatient transfer
-- Add pending_transfer and dirty to bed status (no DB-level enum, text column)
-- No ALTER needed for text columns — the type constraint is only in application code.

-- Add transfer status tracking to encounter_transfers
ALTER TABLE "encounter_transfers"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS "received_at" timestamp,
  ADD COLUMN IF NOT EXISTS "receiving_staff_id" uuid REFERENCES "staff_profiles"("id") ON DELETE SET NULL;
