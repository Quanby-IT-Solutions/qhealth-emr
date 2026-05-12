# [BIL-FE-02] Billing — Design Patterns & Reusable Components

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Frontend Design & UI/UX
**Priority:** P0
**Story Refs:** All Billing Officer stories (12.1 – 12.7)
**Flow Refs:** All L flows

## Description

Define the reusable UI patterns specific to billing: monetary input, line-item editor, encounter context bar, claim status timeline, XML preview pane, payment receipt template.

## Components to Build

- `MoneyInput` — currency-aware input with thousand separators and decimal precision; locale set to `en-PH` with PHP currency code.
- `LineItemEditor` — sortable table with item search, qty, unit price, computed total; supports manual override with a reason.
- `EncounterContextBar` — sticky bar showing MRN, patient name, encounter type, dates, current ledger balance.
- `ClaimStatusTimeline` — visual stepper for Submitted → Returned → Resubmitted → Paid.
- `XmlPreviewPane` — monospace pane with syntax highlight and copy-to-clipboard for CF4 / CF5 / eSOA preview.
- `ReceiptTemplate` — printable component with hospital header, patient block, line items, payment, signature.
- `DiscountSelector` — Senior / PWD / Solo Parent / Manual; enforces max-discount rules per item category.

## Acceptance Criteria

- [ ] `MoneyInput` rejects non-numeric input, formats to two decimals, supports keyboard arrow stepping.
- [ ] `LineItemEditor` supports add/edit/remove, total recalculation, and an exportable JSON shape that matches the backend contract.
- [ ] `EncounterContextBar` is sticky on scroll and collapses to a single-line summary on <768px.
- [ ] `ClaimStatusTimeline` renders all five states (Draft, Submitted, Returned, Resubmitted, Paid) with timestamps.
- [ ] `XmlPreviewPane` collapses long XML and supports search inside the pane.
- [ ] `ReceiptTemplate` is print-stylesheet aware (`@media print`) and produces an A4 layout in browser print preview.
- [ ] All components keyboard accessible and meet WCAG 2.1 AA.

## Dependencies

- ADM-FE-02 (design system primitives), BIL-FE-01.

## References

- USER_FLOWS.md §L1, §L2, §L3, §L5.
- TOR §2.13 — RCM module deliverables.
