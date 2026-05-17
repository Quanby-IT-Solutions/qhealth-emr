ALTER TABLE "lab_orders"
	ADD COLUMN IF NOT EXISTS "clinical_indication" text,
	ADD COLUMN IF NOT EXISTS "indication_icd10_code" text,
	ADD COLUMN IF NOT EXISTS "indication_icd10_display" text;

ALTER TABLE "imaging_orders"
	ADD COLUMN IF NOT EXISTS "indication_icd10_code" text,
	ADD COLUMN IF NOT EXISTS "indication_icd10_display" text;
