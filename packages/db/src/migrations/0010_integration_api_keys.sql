-- Migration: Add integration_api_keys table for managed API key lifecycle

CREATE TABLE IF NOT EXISTS integration_api_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID       NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL,
  key_prefix    TEXT        NOT NULL,
  key_hash      TEXT        NOT NULL,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS integration_api_keys_integration_id_idx
  ON integration_api_keys(integration_id);
