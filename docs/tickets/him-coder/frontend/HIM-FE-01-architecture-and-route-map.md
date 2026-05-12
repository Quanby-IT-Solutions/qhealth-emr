# [HIM-FE-01] HIM — Architecture & Route Map

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 15.1, 15.2, 15.3, 15.4 (USER_STORIES.md §15)
**Flow Refs:** Flows O1, O2, O3, O4 (USER_FLOWS.md §O)

## Description

Define the HIM Coder console route map and folder layout. Cover Chart Deficiency Tracking (15.1), ICD-10 Coding (15.2), Medical Records Issuance (15.3), HAI Surveillance & Reconciliation (15.4).

## Deliverables

- Route group `(him)` under `apps/web/app/`.
- Sub-features under `apps/web/features/him/`:
  - `deficiency-tracking/`
  - `icd10-coding/`
  - `records-issuance/`
  - `hai-reconciliation/`
- HIM Shell with sidebar nav and queue counters (Open Deficiencies, Pending Coding, Pending Records Requests, HAI Pending Review).
- RBAC route guard (`him.read|write` permissions).

## Acceptance Criteria

- [ ] Four sub-feature folders exist with `api/`, `components/`, `lib/` standard layout.
- [ ] `apps/web/features/him/ROUTES.md` documents every route with story id, flow id, and target Wireframe Page name.
- [ ] HIM Shell renders queue badges with placeholder counts.
- [ ] `pnpm lint && pnpm typecheck` clean.
- [ ] No business logic.

## Dependencies

- ADM-FE-01, ADM-FE-02.

## References

- USER_FLOWS.md §O.
- USER_STORIES.md §15.
- TOR §1 — HIM Coder responsibilities.
