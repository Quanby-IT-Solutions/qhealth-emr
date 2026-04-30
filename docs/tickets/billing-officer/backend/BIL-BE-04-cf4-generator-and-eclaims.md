# [BIL-BE-04] CF4 Generator & PhilHealth eClaims Client

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 12.3 — Automated CF4 Generation & eClaims Submission
**Flow Refs:** Flow L3

## Description

Auto-extract clinical data from finalized notes and assemble the CF4 XML payload in the strict PhilHealth schema. Submit and track via the eClaims API.

## Endpoints (oRPC)

- `billing.cf4.generate` — reads patient, encounter, finalized notes, ICD-10 codes, charges; assembles CF4 XML; validates against XSD.
- `billing.cf4.preview` — returns the XML for UI display.
- `billing.cf4.submit` — POSTs to PhilHealth eClaims; persists `submitted_at` and assigned reference.
- `billing.cf4.statusPoll` — polls PhilHealth for status updates; updates `cf4_status_log`.
- `billing.cf4.resubmit`.

## Functional Requirements

- CF4 data sources: chief complaint and history pulled from finalized SOAP notes (Story 4.2 sign requirement); vitals from flowsheet; plan and diagnoses from problem list and ICD-10 coding (Story 15.2).
- XSD validation runs server-side and returns structured violation paths the UI can map to fields.
- Resubmissions store the prior payload and reason.
- Polling is a NestJS cron job (every 6 hours) plus an on-demand mutation for the UI.

## Acceptance Criteria

- [ ] XSD validation is mandatory and blocks `submit` on failure with a row of `{ path, message }` errors.
- [ ] Submission writes a `cf4_status_log` row with status `Submitted` and the PhilHealth reference id.
- [ ] Status timeline reflects the latest PhilHealth response without duplicating rows.
- [ ] Resubmit increments a counter and stores the previous XML uri.
- [ ] Endpoints require `billing.cf4.read|write` permissions.
- [ ] Integration test against a sandbox PhilHealth mock confirms a happy-path submission and a returned-claim flow.

## Dependencies

- BIL-BE-01, BIL-BE-03.
- HIM coding service (HIM-BE-03) — ICD-10 codes must exist before generate is allowed.
- Notes service (out of scope) — mocked for tests.

## References

- USER_FLOWS.md §L3.
- USER_STORIES.md §12 Story 12.3.
- TOR §2.13 — Automated Claim Form 4 (CF4); strict XML format.
