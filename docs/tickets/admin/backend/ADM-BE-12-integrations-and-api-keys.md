# [ADM-BE-12] Integrations & API Key Management

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 20.3 — Integration Settings (ERP, LIS, PACS, Telemed)
**Flow Refs:** Flow T3

## Description

Manage outbound integration configurations (ERP, LIS, PACS, Telemedicine, NHDR), their API keys, webhook URLs, and connectivity health. NHDR FHIR endpoint specifics live in ADM-BE-07; this ticket covers the credential vault and webhook routing layer.

## Endpoints (oRPC)

- `admin.integrations.list|get|upsert|delete`.
- `admin.integrations.testConnection`.
- `admin.integrations.keys.list|create|rotate|revoke`.
- `admin.integrations.webhooks.list|upsert|delete|deliver` — the deliver endpoint is internal; signs payloads with the integration's secret.

## Functional Requirements

- API keys are hashed at rest (argon2 or similar); plaintext is returned only on `create` and `rotate`, never re-readable.
- Key reveal in the UI does NOT round-trip the plaintext — it is purely visual confirmation that a key exists.
- Webhook signing uses HMAC-SHA256 with the integration's stored secret.
- `testConnection` performs a HEAD/GET on the integration's health URL and records latency.

## Acceptance Criteria

- [ ] Plaintext keys never persist; storage holds only the hash plus a 4-character preview tail.
- [ ] `rotate` invalidates the old key after a configurable grace period (default 24h) to allow consumer rollout.
- [ ] Webhook delivery retries with exponential backoff up to 5 times; failures recorded.
- [ ] Endpoints require `admin.integrations.read` / `admin.integrations.write` permissions.
- [ ] All key/webhook operations emit audit events including the actor and the integration id.
- [ ] Unit tests cover the rotation grace window, hash verification, and HMAC signature generation.

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §T3.
- USER_STORIES.md §20 Story 20.3.
- TOR §4.3 — ERP boundary delineation.
