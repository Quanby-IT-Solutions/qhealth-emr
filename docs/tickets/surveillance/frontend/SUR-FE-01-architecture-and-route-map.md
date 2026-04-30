# [SUR-FE-01] Surveillance — Architecture & Route Map

**Role:** Surveillance
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 16.1, 16.2, 16.3 (USER_STORIES.md §16)
**Flow Refs:** Flows P1, P2, P3 (USER_FLOWS.md §P)

## Description

Define the Surveillance & Public Health Reporting Officer route map. Cover PIDSR Notifiable Disease Detection (16.1), AHSR Aggregation (16.2), and Mortality & Morbidity Reporting (16.3).

## Deliverables

- Route group `(surveillance)` under `apps/web/app/`.
- Sub-features under `apps/web/features/surveillance/`:
  - `pidsr/`
  - `ahsr/`
  - `mortality-morbidity/`
- Surveillance Shell with sidebar nav and queue counters (PIDSR Cat-1 due in 24h, PIDSR Cat-2 weekly, AHSR validation issues).
- RBAC route guard (`surveillance.read|write`).

## Acceptance Criteria

- [ ] Three sub-feature folders exist with `api/`, `components/`, `lib/` standard layout.
- [ ] `apps/web/features/surveillance/ROUTES.md` lists each route with story id, flow id, and target Wireframe Page name.
- [ ] Surveillance Shell renders queue badges with placeholder counts.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-FE-01, ADM-FE-02.

## References

- USER_FLOWS.md §P.
- USER_STORIES.md §16.
- TOR §1 — Statutory and Public Health Reporting Officer; TOR §3.
