# [BIL-BE-03] Invoice, Payment & Receipt Service

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 12.2 — Invoice & Payment Processing
**Flow Refs:** Flow L2

## Description

Generate invoices from `Ready for Invoicing` charges, apply discounts, accept payments (Cash / Card / GCash / HMO), and issue official receipts.

## Endpoints (oRPC)

- `billing.invoices.generate` — reads charges, applies discount + VAT, persists invoice + items.
- `billing.invoices.get`, `.list`.
- `billing.invoices.applyDiscount` — pre-generation.
- `billing.payments.record`.
- `billing.payments.recordFromMalasakit` — integration endpoint consumed by MSW-BE-04 reconcile; accepts `{ invoiceId, malasakitCaseId, amount, reference }`; persists payment with `source: MALASAKIT`.
- `billing.payments.list` — per invoice.
- `billing.receipts.issue` — emits a sequential receipt number; persists receipt PDF URI.

## Functional Requirements

- Discounts: Senior, PWD, Solo Parent are mutually exclusive. Manual discount allowed with a reason and capped at the policy threshold from master data.
- VAT computation respects facility tax settings (from facility profile, ADM-BE-11).
- Receipt number sequence is monotonic per facility per fiscal year and never reused; collisions are not possible.
- HMO payments require provider id + claim number + percentage; the patient portion is computed and persisted.

## Acceptance Criteria

- [ ] Discount mutual exclusion enforced at the schema and service level.
- [ ] Receipt numbers are generated atomically (transactional sequence per facility).
- [ ] `payments.record` rejects amounts that overflow the invoice balance; partial payments are supported.
- [ ] All writes audited.
- [ ] Endpoints require `billing.invoices.read|write` and `billing.payments.read|write` permissions.
- [ ] Expose `payments.recordFromMalasakit` integration point for MSW-originated payments. Shared payment-source enum exported from `@repo/contracts` includes `CASH`, `CARD`, `GCASH`, `HMO`, `MALASAKIT`, `PHILHEALTH`, `COE`. Endpoint requires `billing.payments.write` permission and emits `payment.source.malasakit` audit event.
- [ ] Integration tests cover Cash exact, Cash overpayment, partial Card payment, full HMO claim, mixed Cash + HMO, **MALASAKIT payment via `recordFromMalasakit`** confirming source enum persistence and audit emission.

## Dependencies

- BIL-BE-01, BIL-BE-02.

## References

- USER_FLOWS.md §L2.
- USER_STORIES.md §12 Story 12.2.
- TOR §2.13; §6 Flow 5 — discharge billing rules.
