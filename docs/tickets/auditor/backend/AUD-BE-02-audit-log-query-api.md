# [AUD-BE-02] Audit Log Query API

**Role:** Auditor
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review
**Flow Refs:** Flow A6

## Description

Provide a query API for the auditor surface plus an export endpoint for DPA compliance files.

## Endpoints (oRPC)

- `auditor.events.list` — cursor-paginated; filters: dateRange, userId, actionType, severity, resourceType, outcome.
- `auditor.events.get` — full payload + change diff.
- `auditor.events.session` — list events for the same session id.
- `auditor.events.export` — params: format (csv | pdf), filter snapshot; returns signed URL + audit_export row.

## Functional Requirements

- Default sort by `ts DESC`; cursor uses `(ts, id)` to handle ties.
- Result rows include the masking rules per role: even auditors do not see passwords, OTP secrets, signature image bytes, or **PhilHealth PIN** — those are redacted in payload reads while remaining present in the underlying row for forensic queries (DPA compliance).
- Export endpoint hashes the produced file (sha256) and stores the hash in `audit_exports` so the file's authenticity is verifiable later.
- All list/get/export calls themselves emit audit events.

## Acceptance Criteria

- [ ] List p95 <300ms on 10M-row dataset (verified via index plan).
- [ ] Redaction is enforced server-side; unit tests assert specific redacted fields including **passwords, OTP secrets, signature image bytes, PhilHealth PIN** (DPA-sensitive).
- [ ] Export hashing is deterministic — same filter set + same data → same hash.
- [ ] Endpoints require `auditor.events.read` permission.
- [ ] List filters validate inputs strictly via Zod.

## Dependencies

- AUD-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §A6.
- USER_STORIES.md §1 Story 1.6.
- TOR §4.2 — DPA, comprehensive audit trails.
