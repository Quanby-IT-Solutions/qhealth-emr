# [ADM-BE-05] Clinician License Verification API

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 1.4 — Professional License Validation
**Flow Refs:** Flow A4

## Description

Provide endpoints for capturing, verifying, and tracking clinician licenses (PRC, PTR, PDEA S-2). License status drives e-Rx generation (Story 5.2) and controlled-drug ordering (Story 5.3).

## Endpoints (oRPC)

- `admin.licenses.list` — filter by clinician, type, status.
- `admin.licenses.get`.
- `admin.licenses.add` — accepts metadata + signed upload URL for the document.
- `admin.licenses.verify` — runs registry check (PRC API / PTR registry / PDEA registry); falls back to `Pending Manual Review` when registry is unreachable.
- `admin.licenses.markPending`.
- `admin.licenses.expirySweep` — scheduled job emits expiring-soon events (≤30 days).

## Acceptance Criteria

- [ ] Document upload uses presigned URLs; the service stores only the URI and content hash.
- [ ] `verify` writes the verification proof (registry response payload, response timestamp) to the row.
- [ ] When PDEA S-2 is verified, the `clinicians.s2_verified_until` cache is updated so CPOE controlled-drug paths (Story 5.3) can read it without joining at runtime.
- [ ] Expiry sweep is a NestJS scheduled job (cron `0 6 * * *`) that emits `license.expiring` events and writes to the audit log.
- [ ] Endpoints require `admin.licenses.read` / `admin.licenses.write` permissions.
- [ ] Integration tests stub the registry client and assert correct status persistence on success, transient failure, and final failure.

## Dependencies

- ADM-BE-01, ADM-BE-02.
- An object storage facade (e.g., S3/MinIO) for document uploads — out of scope here, mock acceptable for tests.

## References

- USER_FLOWS.md §A4.
- USER_STORIES.md §1 Story 1.4, §5 Stories 5.2 and 5.3 (downstream consumers).
- TOR §1 — Clinician license validation responsibility.
- TOR §2.4 — FDA e-Rx and PDEA S-2 mandates.
