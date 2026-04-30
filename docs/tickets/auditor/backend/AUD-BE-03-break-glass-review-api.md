# [AUD-BE-03] Break-Glass Review API

**Role:** Auditor
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review (break-glass branch)
**Flow Refs:** Flow A5 (capture context), Flow A6 (review)

## Description

Surface break-glass events from `break_glass_events` and persist auditor decisions in `break_glass_reviews`. Power the auditor inbox and the report page.

## Endpoints (oRPC)

- `auditor.breakGlass.inbox.list` — pending + recently reviewed; filters: status, dateRange, clinicianId.
- `auditor.breakGlass.event.get` — event detail with accessed-resources timeline.
- `auditor.breakGlass.review.approve` — input: eventId, reason.
- `auditor.breakGlass.review.flag` — input: eventId, reason.
- `auditor.breakGlass.review.addNote` — input: eventId, note.
- `auditor.breakGlass.history.byClinician` — recent N events per clinician.

## Functional Requirements

- The inbox is filterable by review SLA breach (default 24h since `access_window_end`).
- Approve / Flag / AddNote each writes an immutable `break_glass_reviews` row plus an `audit_events` row of `action_type = auditor.review`.
- Same-clinician history endpoint returns at most the last 25 events for performance.
- The auditor cannot delete or edit prior reviews — only add new notes.

## Acceptance Criteria

- [ ] Each review action requires a reason ≥10 characters; shorter inputs are rejected.
- [ ] Approve / Flag transitions are recorded so the inbox state reflects the latest decision.
- [ ] Review actions themselves emit audit events (auditor actions are auditable).
- [ ] Endpoints require `auditor.breakGlass.read` for read endpoints and `auditor.breakGlass.review` for write endpoints.
- [ ] Integration tests verify the reason length, the audit row chain, and SLA filtering.

## Dependencies

- AUD-BE-01, ADM-BE-02.
- Break-Glass Clinician access flow (out of scope for this batch — produces the source events).

## References

- USER_FLOWS.md §A5, §A6.
- USER_STORIES.md §1 Stories 1.5, 1.6.
- TOR §1 — Break-Glass Clinician with high-priority audit log; Auditor / Privacy Officer.
- TOR §4.2 — DPA compliance.
