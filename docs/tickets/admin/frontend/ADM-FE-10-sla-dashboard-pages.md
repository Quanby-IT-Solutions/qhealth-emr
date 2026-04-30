# [ADM-FE-10] Admin — SLA Dashboard, Turnaround & Bottleneck Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 19.2 — Citizen's Charter Turnaround Reporting (USER_STORIES.md §19)
**Flow Refs:** Flow S2 — Citizen's Charter Turnaround Reporting (USER_FLOWS.md §S2)

## Description

Build the **SLA Dashboard**, **Turnaround Report Page**, and **Bottleneck Analysis Page** from Flow S2. Admin reviews per-workflow SLA compliance, drills into daily breakdowns, and identifies bottlenecks.

## Pages to Build

| Page | Route |
|------|-------|
| SLA Dashboard | `/admin/sla` |
| Turnaround Report Page | `/admin/sla/turnaround/[workflowId]` |
| Bottleneck Analysis Page | `/admin/sla/bottleneck/[workflowId]` |

## Functional Requirements (per Flow S2)

- SLA Dashboard: KPI tile per ARTA flow showing % within SLA, click-through to per-flow drilldown.
- Turnaround Report: daily breakdown table (date, # cases, median TAT, p95 TAT, % within SLA), trend chart.
- Bottleneck Analysis: stalled-step waterfall — for each step in the flow show median time and outliers (the slowest 5%); links to the offending encounter for investigation.
- Export ARTA-compliant PDF report (date range, workflow scope, signature line for the admin).

## Acceptance Criteria

- [ ] Dashboard shows seven KPI tiles (one per ARTA flow) plus an overall compliance %.
- [ ] Tiles use the design system's status colors: green ≥95%, amber 85–95%, red <85%.
- [ ] Turnaround Report supports comparison between two date ranges side-by-side.
- [ ] Bottleneck waterfall is interactive — clicking a step filters the table below to encounters that breached at that step.
- [ ] PDF export header contains the facility name, DOH license number (from Story 20.1 Facility Settings), report period, and admin signature line.
- [ ] Outlier definitions are documented in a tooltip (`outliers = >p95 of step duration`).
- [ ] Page is responsive at 1280px and gracefully stacks at 768px.

## Dependencies

- ADM-FE-01, ADM-FE-02, ADM-FE-09 (SLA Configuration must exist for the dashboard to be meaningful).
- ADM-BE-10 (turnaround analytics service) for live data.

## References

- USER_FLOWS.md §S2.
- USER_STORIES.md §19 Story 19.2.
- TOR §6 — ARTA Flows and SLA targets.
