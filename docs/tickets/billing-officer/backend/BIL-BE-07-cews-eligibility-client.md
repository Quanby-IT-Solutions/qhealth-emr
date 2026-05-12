# [BIL-BE-07] PhilHealth CEWS Eligibility Client

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 12.6 — PhilHealth Eligibility (CEWS) Check
**Flow Refs:** Flow L6

## Description

Wrap PhilHealth's Eligibility Web Services (CEWS) and persist eligibility snapshots to encounters.

## Endpoints (oRPC)

- `billing.cews.verify` — input: memberPin, encounterId; calls CEWS, returns membership data.
- `billing.cews.snapshot` — persists the verification result to the encounter.
- `billing.cews.snapshots.list` — for an encounter, ordered by capturedAt.

## Functional Requirements

- CEWS client honors PhilHealth's auth scheme (from ADM-BE-12 integrations) and rate limits.
- A graceful-degradation mode returns `service_unavailable` and records the attempt; the UI then offers to retry or save a manual eligibility note.
- Snapshots are immutable once saved; new verifications create new snapshots.
- The latest snapshot per encounter is exposed via a derived view for downstream modules (CF4, eSOA).

## Acceptance Criteria

- [ ] CEWS client retries idempotent reads up to 3 times with exponential backoff; non-idempotent operations do not retry.
- [ ] Snapshot persistence is atomic with the audit log emission.
- [ ] PIN format validation rejects non-12-digit input before any external call.
- [ ] Endpoints require `billing.cews.read|write` permissions.
- [ ] Integration tests against a CEWS mock cover Active, Lapsed, Service-Unavailable.

## Dependencies

- BIL-BE-01, ADM-BE-12 (integrations and credential vault).

## References

- USER_FLOWS.md §L6.
- USER_STORIES.md §12 Story 12.6.
- TOR §2.13 — Eligibility Web Services (CEWS).
