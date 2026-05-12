# [BIL-BE-06] eSOA Generation Service

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 12.5 — eSOA Generation
**Flow Refs:** Flow L5

## Description

Compile the Electronic Statement of Account in PhilHealth-compliant XML and a print-ready PDF. Track delivery to the patient.

## Endpoints (oRPC)

- `billing.esoa.generate` — input: invoiceId; output: { xmlUri, pdfUri, version }.
- `billing.esoa.list` — versions per invoice.
- `billing.esoa.send` — channel (Patient Portal | Email | Print); records delivery.

## Functional Requirements

- XML schema validated against PhilHealth eSOA XSD; the validator lives in `apps/backend/src/modules/v1/billing/esoa/xsd/`.
- Each generation increments a version; prior versions are kept for audit.
- PDF rendering uses a deterministic template; pixel diffs across regenerations of identical input are not allowed.
- Send-via channel records a delivery audit row including the channel, the recipient identifier, and the delivery status.

## Acceptance Criteria

- [ ] `generate` is idempotent for the same invoice version — no duplicate eSOA rows.
- [ ] Send is rejected when the latest invoice has an unsettled balance, unless `allowDraft=true` is provided with a reason.
- [ ] Generated XML totals tie out to the invoice exactly; mismatch is rejected before persistence.
- [ ] Endpoints require `billing.esoa.read|write` permissions.
- [ ] Unit and integration tests cover regeneration, send, and draft-mode.

## Dependencies

- BIL-BE-01, BIL-BE-03.

## References

- USER_FLOWS.md §L5.
- USER_STORIES.md §12 Story 12.5.
- TOR §2.13 — eSOA in XML format.
