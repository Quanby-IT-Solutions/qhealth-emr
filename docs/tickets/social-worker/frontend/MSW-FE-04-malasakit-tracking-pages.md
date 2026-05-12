# [MSW-FE-04] Social Worker — Malasakit Tracking Pages

**Role:** Social Worker
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 12.10 — Malasakit Center Tracking
**Flow Refs:** Flow L10 (USER_FLOWS.md §L10)

## Description

Build the **Malasakit Tracking Page** from Flow L10. Track patients pending Malasakit assistance from DSWD / PCSO / DOH-MAIFIP and reconcile with billing.

## Pages to Build

| Page | Route |
|------|-------|
| Malasakit Tracking Page | `/msw/malasakit` |
| Case Detail Page | `/msw/malasakit/[caseId]` |

## Functional Requirements (per Flow L10)

- Tracking Page columns: Patient, Encounter, Source (DSWD / PCSO / DOH-MAIFIP), Status (Pending / Approved / Released / Denied), Amount Granted, Date Updated, MSW Owner.
- Filters: Source, Status, Date Range.
- Case Detail Page: timeline of status changes, attached documents, notes, reconciliation status against billing.
- CTA `Update Status` — drawer to change status, capture amount, source, reference number.

## Acceptance Criteria

- [ ] Status timeline shows every transition with timestamp, actor, and note.
- [ ] Filters are URL-synced.
- [ ] Reconciliation badge shows whether the granted amount has been applied to a billing entry; clicking opens the linked invoice.
- [ ] Update Status drawer enforces a reason field for `Denied` status.
- [ ] Multi-source cases are supported (e.g., partial DSWD + partial PCSO).
- [ ] Empty / loading / error states.

## Dependencies

- MSW-FE-01, ADM-FE-02.
- MSW-BE-04 (Malasakit service) for live wiring.

## References

- USER_FLOWS.md §L10.
- USER_STORIES.md §12 Story 12.10.
- TOR §1 — MSW liaison for Malasakit Centers.
