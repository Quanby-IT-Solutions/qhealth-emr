# [ADM-FE-09] Admin — SLA Configuration & Workflow Status Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 19.1 — Workflow Time-Stamping (USER_STORIES.md §19)
**Flow Refs:** Flow S1 — Configure SLA Targets (USER_FLOWS.md §S1)

## Description

Build the **SLA Configuration Page** and **Workflow Status Log Page** from Flow S1. Admin sets target turnaround times per workflow (OPD, ER, Discharge, Records, etc. — TOR §6 ARTA Flows 1–7).

## Pages to Build

| Page | Route |
|------|-------|
| SLA Configuration Page | `/admin/sla/config` |
| Workflow Status Log Page | `/admin/sla/status-log` |

## Functional Requirements (per Flow S1)

- SLA Configuration Page rows: Workflow Name, Step, Target Minutes, Hard Cap, Notification Threshold (% of target).
- Pre-populate from TOR §6 ARTA Flows 1–7 (e.g., OPD Triage 3–5 mins, OPD Registration 5–10 mins, ER Rapid Triage 1–3 mins, Discharge Bill Generation 30–60 mins).
- Workflow Status Log: live-feed style page showing the most recent status changes across the hospital, color-coded by workflow.
- Filters: workflow, ward, date range, breaching-only.

## Acceptance Criteria

- [ ] Configuration page is grouped by ARTA Flow (1–7) with a collapsible card per flow.
- [ ] Editing a row inline saves on blur with optimistic UI and rollback on server error.
- [ ] Hard Cap >= Target Minutes is enforced client-side.
- [ ] Status Log refreshes every 30 seconds or on a manual `Refresh` CTA; pause-stream toggle.
- [ ] Breaching rows show a destructive `StatusBadge` and a tooltip with the elapsed-vs-target delta.
- [ ] Bulk-edit mode lets admin update Target Minutes for multiple steps at once.
- [ ] All seven ARTA flows have at least one default row pre-loaded.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-09 (SLA timestamp service) for live data.

## References

- USER_FLOWS.md §S1.
- USER_STORIES.md §19 Story 19.1.
- TOR §6 — Unified Citizen's Charter System Workflows (ARTA Compliant); Flows 1–7 with Target SLA columns.
