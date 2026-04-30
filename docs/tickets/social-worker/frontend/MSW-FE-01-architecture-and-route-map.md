# [MSW-FE-01] Social Worker — Architecture & Route Map

**Role:** Social Worker
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 12.8, 12.9, 12.10, 12.11 (USER_STORIES.md §12)
**Flow Refs:** Flows L8, L9, L10, L11 (USER_FLOWS.md §L)

## Description

Define the Medical Social Worker (MSW) console route map and folder layout. Cover Financial Evaluation & CoE (12.8), PhilHealth Annex A & B Signature Capture (12.9), Malasakit Tracking (12.10), and Ancillary Service Clearance (12.11).

## Deliverables

- Route group `(msw)` under `apps/web/app/`.
- Sub-features under `apps/web/features/msw/`:
  - `assessment-coe/`
  - `annex-signatures/`
  - `malasakit-tracking/`
  - `ancillary-clearance/`
- MSW Shell layout with sidebar nav, queue counters (Pending Assessments, Annex pending, Ancillary blocked).
- RBAC route guard (`msw.read|write` permissions).

## Acceptance Criteria

- [ ] Four sub-feature folders exist with `api/`, `components/`, `lib/` standard layout.
- [ ] `apps/web/features/msw/ROUTES.md` documents every route with story id, flow id, and target Wireframe Page name.
- [ ] MSW Shell renders queue badges with placeholder counts (live counts wired in MSW-FE-06).
- [ ] `pnpm lint && pnpm typecheck` clean.
- [ ] No business logic in this ticket.

## Dependencies

- ADM-FE-01, ADM-FE-02 (admin shell + design system reused).

## References

- USER_FLOWS.md §L8 – §L11.
- USER_STORIES.md §12.
- TOR §1 — Medical Social Worker role.
