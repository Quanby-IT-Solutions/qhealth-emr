-- Stable machine identifier for seeded system roles. Gating code matches on
-- this key instead of the display name, so renaming a role in the admin UI
-- cannot silently break role-scoped behaviour. Backfills existing seeded
-- roles from their canonical names.
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "system_key" text;

CREATE INDEX IF NOT EXISTS "roles_system_key_idx" ON "roles" ("system_key");

UPDATE "roles"
SET "system_key" = lower(regexp_replace("name", '[^A-Za-z0-9]+', '_', 'g'))
WHERE "system_key" IS NULL
	AND "is_system_default" = true
	AND "name" IN (
		'Administrator', 'Physician', 'Nurse', 'Pharmacist', 'Billing Officer',
		'PIDSR Officer', 'Registrar', 'Triage Officer', 'Surgeon',
		'Anesthesiologist', 'Lab Technologist', 'Radiologist',
		'Blood Bank Technician', 'HIM Coder', 'Medical Social Worker',
		'Clinical Dietitian', 'Scheduler', 'Auditor', 'Clinic Coordinator'
	);
