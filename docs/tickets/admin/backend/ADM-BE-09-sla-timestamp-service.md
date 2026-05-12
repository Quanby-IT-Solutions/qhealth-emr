# [ADM-BE-09] SLA Timestamping Service

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 19.1 — Workflow Time-Stamping
**Flow Refs:** Flow S1

## Description

Background time-stamping engine that records every workflow status change to `workflow_status_log`. Consumed by ADM-BE-10 for analytics. Targets are configured by admins per ARTA Flow.

## Endpoints (oRPC)

- `admin.sla.targets.list`, `.get`, `.upsert`, `.delete`.
- `admin.sla.statusLog.append` — internal endpoint called by other modules' interceptors when a status changes.
- `admin.sla.statusLog.list` — filters by workflow, ward, date, breach-only.

## Functional Requirements

- A NestJS interceptor `WorkflowStatusInterceptor` captures status transitions emitted by domain events (e.g., encounter `Queued` → `In Progress`) and writes to `workflow_status_log` asynchronously.
- Targets are pre-seeded from TOR §6 ARTA Flows 1–7 via a migration.
- A breach is computed as `now - started_at > target_minutes`; a hard-cap breach raises `sla.hardCapBreached` event.

## Acceptance Criteria

- [ ] Migration seeds the seven ARTA flows with at least one default target each (e.g., OPD Triage 5 minutes hard-cap 10).
- [ ] `append` endpoint enforces idempotency on `(encounter_id, workflow, step, started_at)`.
- [ ] Status log queries are paginated (max 200 rows per page).
- [ ] Hard-cap breach events trigger an audit row.
- [ ] Endpoints require `admin.sla.read` / `admin.sla.write`.
- [ ] Unit tests verify breach detection at boundaries.

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §S1.
- USER_STORIES.md §19 Story 19.1.
- TOR §6 — ARTA flows and target SLAs.
