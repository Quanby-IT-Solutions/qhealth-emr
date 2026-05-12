# [BIL-FE-04] Billing — Invoice, Payment & Receipt Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 12.2 — Invoice & Payment Processing
**Flow Refs:** Flow L2 (USER_FLOWS.md §L2)

## Description

Build the **Invoice Page**, **Payment Entry Page**, and **Receipt Page** from Flow L2. Apply discounts (Senior / PWD / Solo Parent), accept payment methods (Cash / Card / GCash / HMO), and print receipts.

## Pages to Build

| Page | Route |
|------|-------|
| Invoice Page | `/billing/encounters/[encounterId]/invoice` |
| Payment Entry Page | `/billing/encounters/[encounterId]/invoice/payment` |
| Receipt Page | `/billing/encounters/[encounterId]/invoice/receipt` |

## Functional Requirements (per Flow L2)

- Invoice Page lists items pulled from `Ready for Invoicing` charges (BIL-FE-03), shows discount picker, computes subtotal, discount, VAT, total. CTA `Generate Invoice`.
- Payment Entry Page: payment method radio (Cash, Card, GCash, HMO); amount tendered with auto-computed change for Cash; reference number input for non-cash methods; HMO requires HMO provider + claim number + percentage covered.
- Receipt Page renders a print-optimized layout via `ReceiptTemplate`; includes barcode for the encounter ID.

## Acceptance Criteria

- [ ] Discount picker enforces single-discount-only rule (Senior OR PWD OR Solo Parent, not stacked) with an inline explanation.
- [ ] Manual discount line requires a reason and triggers a confirmation dialog.
- [ ] Payment Entry Page enforces `amount tendered ≥ total` for Cash before enabling the `Print Receipt` CTA.
- [ ] HMO method renders an additional sub-form with provider lookup (mocked list); the covered amount is subtracted from the patient's portion.
- [ ] Receipt Page is print-tested in Chrome and Edge — no overflow on A4.
- [ ] Receipt page includes the official receipt number issued by the backend.
- [ ] After receipt issue, encounter status transitions to `Paid` via mutation; UI shows the new status without a hard reload.

## Dependencies

- BIL-FE-01, BIL-FE-02, BIL-FE-03.
- BIL-BE-03 (invoice / payment service) for live wiring.

## References

- USER_FLOWS.md §L2.
- USER_STORIES.md §12 Story 12.2.
- TOR §6 Flow 5 — Inpatient Discharge & Billing — for Senior / PWD discount rules and ARTA SLA.
