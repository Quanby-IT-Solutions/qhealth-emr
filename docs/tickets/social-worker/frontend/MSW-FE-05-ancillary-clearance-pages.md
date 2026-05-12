# [MSW-FE-05] Social Worker — Ancillary Service Clearance Pages

**Role:** Social Worker
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 12.11 — Ancillary Service Clearance
**Flow Refs:** Flow L11 (USER_FLOWS.md §L11)

## Description

Build the **Ancillary Clearance Page** and **Coverage Application Page** from Flow L11. Apply Malasakit / PhilHealth coverage at the point of an ancillary order so the order status flips from `Pending Payment` to `Cleared for Procedure`. Drives ARTA Flow 3 and Flow 6 SLAs.

## Pages to Build

| Page | Route |
|------|-------|
| Ancillary Clearance Page | `/msw/ancillary-clearance` |
| Coverage Application Page | `/msw/ancillary-clearance/[orderId]` |

## Functional Requirements (per Flow L11)

- Clearance Page is a queue of orders with status `Pending Payment`, sortable by wait time, ancillary type (Lab / Imaging / Pharmacy).
- Click row → Coverage Application Page.
- Application Page: order summary, patient, eligibility snapshot (from BIL-FE-08), available coverage sources (Malasakit / PhilHealth / CoE issued earlier).
- Apply selected coverage; CTA `Clear for Procedure` flips status server-side.

## Acceptance Criteria

- [ ] Queue auto-refreshes every 30 seconds with a manual refresh CTA.
- [ ] Wait-time chip turns destructive when wait exceeds the ARTA SLA from TOR §6 Flow 3 (Billing/MSW step target 5–15 mins).
- [ ] Coverage application supports partial coverage with the remaining patient balance shown.
- [ ] `Clear for Procedure` requires at least one coverage source applied or an explicit `Override (no coverage)` reason.
- [ ] Status transitions are reflected immediately on the queue without a manual refresh.
- [ ] Empty / loading / error states.

## Dependencies

- MSW-FE-01, ADM-FE-02.
- MSW-BE-05 (ancillary clearance service) for live wiring.
- BIL-FE-08 / BIL-BE-07 for eligibility snapshot reuse.

## References

- USER_FLOWS.md §L11.
- USER_STORIES.md §12 Story 12.11.
- TOR §6 — ARTA Flow 3 (Ancillary Services) and Flow 6 (Outpatient Pharmacy Dispensing).
