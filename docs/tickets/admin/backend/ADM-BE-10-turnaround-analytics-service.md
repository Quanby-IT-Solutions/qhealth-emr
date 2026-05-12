# [ADM-BE-10] Turnaround & Bottleneck Analytics Service

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 19.2 — Citizen's Charter Turnaround Reporting
**Flow Refs:** Flow S2

## Description

Aggregate `workflow_status_log` (ADM-BE-09) into compliance metrics, daily breakdowns, and bottleneck analyses for the Citizen's Charter Turnaround Time report.

## Endpoints (oRPC)

- `admin.sla.dashboard` — KPI tiles per ARTA flow.
- `admin.sla.turnaround` — params: workflowId, dateRange, compareWith?; returns daily aggregates.
- `admin.sla.bottleneck` — params: workflowId, dateRange; returns per-step waterfall + slowest 5%.
- `admin.sla.export` — PDF report.

## Functional Requirements

- Aggregations use a materialized view refreshed every 15 minutes for performance.
- Outlier definition is `step_duration > p95(step_duration)` for the selected period.
- PDF includes facility name, license number, period, signature line.

## Acceptance Criteria

- [ ] Dashboard returns one tile per ARTA flow and an overall composite tile.
- [ ] Turnaround response includes `cases`, `medianTAT`, `p95TAT`, `withinSLAPct`, `breachCount` per day.
- [ ] Bottleneck response identifies the slowest 5% of cases per step and links each to its encounter id for drilldown.
- [ ] PDF renders consistently with the same data the dashboard shows for the same range.
- [ ] Endpoints require `admin.sla.read`.
- [ ] Service unit tests cover edge cases: empty range, single case, all breaching.

## Dependencies

- ADM-BE-01, ADM-BE-02, ADM-BE-09.

## References

- USER_FLOWS.md §S2.
- USER_STORIES.md §19 Story 19.2.
- TOR §6 — ARTA compliance and SLAs.
