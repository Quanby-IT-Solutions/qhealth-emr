-- Migration: Add SNOMED CT columns to problems table
-- TOR §4.1 requires ICD-10/SNOMED CT terminology enforcement for diagnoses.
-- These columns store the SNOMED CT concept ID and preferred display term
-- alongside the existing ICD-10 code for each patient problem/diagnosis.

ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "snomed_code" text;
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "snomed_display" text;
