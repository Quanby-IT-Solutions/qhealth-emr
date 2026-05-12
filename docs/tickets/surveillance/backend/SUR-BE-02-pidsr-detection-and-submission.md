# [SUR-BE-02] PIDSR Detection & Submission Service

**Role:** Surveillance
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 16.1 — PIDSR Notifiable Disease Detection
**Flow Refs:** Flow P1

## Description

Detect Cat-1 (immediate) and Cat-2 (weekly) notifiable diseases via syndromic keywords + ICD-10 matches; surface alerts; submit to DOH portal.

## Endpoints (oRPC)

- `surveillance.pidsr.alerts.list` — filters: category, status, dateRange, disease.
- `surveillance.pidsr.alerts.confirm` — promote to a submission.
- `surveillance.pidsr.alerts.dismiss` — with reason.
- `surveillance.pidsr.submissions.transmitCat1` — single case.
- `surveillance.pidsr.submissions.transmitCat2Batch` — multiple Cat-2 cases.
- `surveillance.pidsr.detection.scan` — internal job.

## Functional Requirements

- Detection runs on chart events (note finalized, ICD-10 signed, lab result released) and writes alerts when keywords or codes match the configured rule set (master data).
- Cat-1 alerts emit a destructive notification to the surveillance officer's queue immediately.
- DOH transmission uses ADM-BE-12 integration credentials.
- Submission outcomes (success / failure / retry) are persisted.

## Acceptance Criteria

- [ ] Detection rules are configurable via master data; updating rules does not retroactively re-flag historical cases unless explicitly requested.
- [ ] Cat-1 alert latency from chart event to alert row is <60 seconds.
- [ ] Transmit endpoints are idempotent on `(alertIds, payloadHash)`.
- [ ] Transmission failures are retryable; final-failure alerts surface to admin and surveillance.
- [ ] Endpoints require `surveillance.pidsr.read|write` permissions.
- [ ] Integration tests cover happy path, rule mismatch, transmission failure with retry.

## Dependencies

- SUR-BE-01, ADM-BE-12.
- Chart events (notes, ICD-10, labs) — out of scope; mocked for tests.

## References

- USER_FLOWS.md §P1.
- USER_STORIES.md §16 Story 16.1.
- TOR §3 — PIDSR Integration; Cat-1 immediate / Cat-2 weekly.
