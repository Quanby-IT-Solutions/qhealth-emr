-- Migration: Add missing readiness-level column to integrations table
-- The Drizzle schema defines lastTestReadinessLevel but migration 0009 only added
-- last_tested_at and last_test_status.  This migration fills the gap.

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS last_test_readiness_level TEXT;
