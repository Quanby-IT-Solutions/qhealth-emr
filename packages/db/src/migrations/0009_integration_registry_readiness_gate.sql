-- Migration: Add readiness gate columns to integrations table
-- These columns are written by testConnectivity and gate activation.

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS last_tested_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT;
