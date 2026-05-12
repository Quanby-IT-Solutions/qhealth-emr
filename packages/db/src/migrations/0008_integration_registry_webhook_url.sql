-- =============================================================================
-- Integration Registry: Add webhook_url column
--
-- INTREG-001: Adds optional webhook_url to the integrations table so that
-- push-based integrations can store the URL they should deliver events to.
-- Idempotent: IF NOT EXISTS guard prevents re-running errors.
-- =============================================================================

ALTER TABLE integrations
    ADD COLUMN IF NOT EXISTS webhook_url text;
