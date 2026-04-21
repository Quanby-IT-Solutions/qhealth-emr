# ADM-08: Build ARTA And SLA Turnaround Monitoring Widgets

## Summary

Implement dashboard widgets for Citizen's Charter turnaround monitoring and SLA breach visibility.

## Problem

The TOR explicitly requires background time-and-motion tracking and automated turnaround-time reporting for ARTA compliance, but the Administrator dashboard does not currently expose these metrics.

## Source References

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `apps/web/app/(site)/sla/page.tsx`
- `apps/web/app/(site)/admin/sla/page.tsx`
- `apps/web/features/sla/components/sla-dashboard.tsx`

## Scope

- add widgets for:
  - active SLA breaches
  - average turnaround by workflow
  - overdue queues
  - bottlenecks by module
  - top breached workflows
- add links into:
  - `/sla`
  - `/admin/sla`
  - `/reporting/sla`

## Out of Scope

- implementing every workflow timestamp if not already captured
- advanced BI/report exports beyond dashboard summaries

## Acceptance Criteria

- dashboard includes at least one ARTA/SLA summary card and one breach/overdue list
- Administrator can identify which workflows are out of target
- data is sourced from real timing events where available
- if some timing data is unavailable, the UI states that explicitly instead of showing fake metrics

## Implementation Notes

- define the minimum viable set of workflows to include in Phase 1
- if prerequisite event instrumentation is incomplete, split follow-up tasks accordingly

## Validation

- use seeded/test breach scenarios where possible
- confirm counts match `/sla` or `/reporting/sla` views when backed by the same data source

## Dependencies

- ADM-03
- may depend on separate instrumentation work outside this epic

## Risks

- missing workflow timing events may block full delivery of ARTA summaries

## Definition of Done

- Administrator dashboard surfaces live or explicitly unavailable ARTA/SLA metrics with no misleading placeholders