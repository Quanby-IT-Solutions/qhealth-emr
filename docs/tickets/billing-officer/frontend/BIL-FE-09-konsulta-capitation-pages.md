# [BIL-FE-09] Billing — Konsulta Capitation Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P2
**Story Refs:** Story 12.7 — Konsulta Capitation Tracking
**Flow Refs:** Flow L7 (USER_FLOWS.md §L7)

## Description

Build the **Konsulta Tracker Page** and **Capitation Report Page** from Flow L7. Show per-patient capitation activities (FPE, follow-ups, labs) and generate the Konsulta capitation report for PhilHealth submission.

## Pages to Build

| Page | Route |
|------|-------|
| Konsulta Tracker Page | `/billing/konsulta` |
| Capitation Report Page | `/billing/konsulta/report` |

## Functional Requirements (per Flow L7)

- Tracker Page: filter by period, member status; columns Patient, PIN, FPE Date, Last Follow-up, Labs Count, Capitation Tag (Eligible / Pending / Lapsed).
- Capitation Report Page: aggregated counts per period, downloadable XML / CSV.
- Drilldown from any tracker row to the patient's Konsulta activity timeline.

## Acceptance Criteria

- [ ] Tracker filter state is URL-synced and shareable.
- [ ] Status tags are computed from raw data with explicit business rules visible via tooltip.
- [ ] Report Page exports for PhilHealth Konsulta submission (XML) and analytics (CSV).
- [ ] Empty / loading / error states.
- [ ] Tracker supports server-side pagination and sorting.

## Dependencies

- BIL-FE-01, BIL-FE-02.
- BIL-BE-08 (Konsulta service) for live wiring.

## References

- USER_FLOWS.md §L7.
- USER_STORIES.md §12 Story 12.7.
- TOR §2.13 — Konsulta Capitation.
