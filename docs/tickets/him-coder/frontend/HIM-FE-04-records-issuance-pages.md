# [HIM-FE-04] HIM — Medical Records Issuance Pages

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 15.3 — Medical Records Issuance
**Flow Refs:** Flow O3 (USER_FLOWS.md §O3)

## Description

Build the **Records Request Page**, **Document Release Page**, and **Release Audit Page** from Flow O3. Process patient requests for medical records, certificates, and abstracts under DPA consent rules.

## Pages to Build

| Page | Route |
|------|-------|
| Records Request Page | `/him/records-requests` |
| Records Request Detail | `/him/records-requests/[requestId]` |
| Document Release Page | `/him/records-requests/[requestId]/release` |
| Release Audit Page | `/him/records-audit` |

## Functional Requirements (per Flow O3)

- Request List: status (New, Verifying ID, Awaiting Payment, Ready, Released, Denied), patient, document types requested, requester relationship.
- Request Detail: identity verification step (upload ID, capture relationship proof), DPA consent capture, document selection.
- Release Page: physician-signature capture for Medical Certificate, payment status (pulled from billing), CTA `Release` once paid.
- Audit Page: full release log with timestamp, document, recipient, channel.

## Acceptance Criteria

- [ ] DPA consent capture cannot be skipped; `Release` is disabled until consent is recorded with a stored signature.
- [ ] Identity verification step blocks progression until at least one valid ID is uploaded.
- [ ] Release CTA is disabled until billing reports `Paid` status for this request.
- [ ] Release writes a tamper-evident audit row visible on the Release Audit Page.
- [ ] Audit Page filters by date, document type, recipient.
- [ ] Signature capture surface accepts signed-PDF upload for the demo when no in-scope physician seed is available — accepts PDF up to 10MB, validates content type, stores signed-PDF reference on the records request.
- [ ] Empty / loading / error states.

## Dependencies

- HIM-FE-01, ADM-FE-02.
- HIM-BE-04 (records service) and BIL-BE-03 (payment confirmation) for live wiring.

## References

- USER_FLOWS.md §O3.
- USER_STORIES.md §15 Story 15.3.
- TOR §6 Flow 7 — Issuance of Medical Records & Certificates; TOR §4.2 — DPA compliance.
