# [BIL-BE-08] Konsulta Capitation Tracking Service

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P2
**Story Refs:** Story 12.7 — Konsulta Capitation Tracking
**Flow Refs:** Flow L7

## Description

Aggregate per-patient Konsulta activities (FPE submissions, follow-ups, labs) and produce the capitation report payload for PhilHealth.

## Endpoints (oRPC)

- `billing.konsulta.activities.list` — by patient, period, type.
- `billing.konsulta.activities.recordEvent` — internal endpoint called by FPE / follow-up modules to log a capitation-eligible activity.
- `billing.konsulta.report.generate` — period; returns aggregate counts + XML/CSV URIs.

## Functional Requirements

- Activity ingestion listens to events from FPE submission (Story 4.3) and follow-up encounters; idempotent on `(patient_id, activity_type, date)`.
- Report generation is parameterized by reporting period (monthly, quarterly).
- XML matches PhilHealth's Konsulta capitation submission schema; CSV is for analytics.

## Acceptance Criteria

- [ ] Idempotency enforced — repeated event ingestion does not duplicate activities.
- [ ] Report endpoint outputs both XML and CSV from the same data.
- [ ] Report includes member-level breakdown and aggregate counts.
- [ ] Endpoints require `billing.konsulta.read|write` permissions.
- [ ] Unit tests cover idempotent ingestion, period boundary edge cases.

## Dependencies

- BIL-BE-01.
- FPE emitter (out of scope); mock for tests.

## References

- USER_FLOWS.md §L7.
- USER_STORIES.md §12 Story 12.7.
- TOR §2.13 — Konsulta Capitation.
