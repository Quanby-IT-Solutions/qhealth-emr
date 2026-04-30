# [AUD-FE-01] Auditor — Architecture & Route Map

**Role:** Auditor
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review (USER_STORIES.md §1)
**Flow Refs:** Flow A6 — Review Audit Trail & Break-Glass Events (USER_FLOWS.md §A6)

## Description

Define the Auditor / Privacy Officer route map and folder layout. Auditor has read-all access and reviews break-glass events.

## Deliverables

- Route group `(auditor)` under `apps/web/app/`.
- Sub-features under `apps/web/features/auditor/`:
  - `audit-log/`
  - `break-glass-review/`
- Auditor Shell with sidebar (Audit Log, Break-Glass Reviews) and a header banner enforcing the "read-only" privilege.
- RBAC route guard (`auditor.read` permission only — no write surface other than review actions).

## Acceptance Criteria

- [ ] Two sub-feature folders exist with `api/`, `components/`, `lib/` standard layout.
- [ ] `apps/web/features/auditor/ROUTES.md` lists each route with story id, flow id, and target Wireframe Page name.
- [ ] Auditor Shell shows a persistent banner: `Read-only access — Auditor / Privacy Officer`.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-FE-01, ADM-FE-02.

## References

- USER_FLOWS.md §A6.
- USER_STORIES.md §1 Story 1.6.
- TOR §1 — Auditor / Privacy Officer.
- TOR §4.2 — DPA compliance.
