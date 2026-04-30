# [ADM-FE-01] Admin Console — Architecture & Route Map

**Role:** Admin
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 1.2, 1.3, 1.4, 2.5, 17.1, 17.2, 19.1, 19.2, 20.1, 20.2, 20.3 (USER_STORIES.md §1, §2, §17, §19, §20)
**Flow Refs:** Flows A2, A3, A4, B5, Q1, Q2, S1, S2, T1, T2, T3 (USER_FLOWS.md)

## Description

Define the admin console route map, navigation hierarchy, and feature-folder layout in `apps/web/features/admin/` before any page implementation begins. This ticket produces a concrete plan; no functional UI is expected.

The admin console must accommodate eleven distinct functional areas drawn from the user stories: User Management (1.2), Feature Flags (1.3), Clinician Licenses (1.4), BOR / Census (2.5), FHIR Endpoints (17.1), Terminology (17.2), SLA Configuration (19.1), SLA Dashboard (19.2), Facility & Department Setup (20.1), Master Data (20.2), and Integration Settings (20.3).

## Deliverables

1. Route map document (markdown) listing every admin URL under `/admin/*` with its source story and target page (matching the Wireframe Pages from USER_FLOWS.md).
2. **Shared (non-admin) auth routes** — list `/login`, `/login/2fa`, `/forgot-password`, `/forgot-password/sent`, `/forgot-password/reset` in the route map and explicitly mark them as **shared shell** (NOT under `(admin)` route group). Implementation owned by `AUTH-FE-01`.
3. Folder scaffolding for `apps/web/features/admin/` with sub-features:
   - `user-management/`
   - `feature-flags/`
   - `clinician-licenses/`
   - `bor-census/`
   - `fhir-endpoints/`
   - `terminology/`
   - `sla/`
   - `facility-setup/`
   - `master-data/`
   - `integrations/`
3. Shared admin shell layout component plan (sidebar nav, breadcrumb, top bar with role indicator).
4. RBAC route-guard strategy for admin-only routes (Story 1.2 enforcement at the UI layer).

## Acceptance Criteria

- [ ] `apps/web/app/(admin)/admin/` route group is created with a `layout.tsx` that renders the Admin Shell.
- [ ] Route map (`ROUTES.md`) includes the shared auth routes (`/login`, `/login/2fa`, `/forgot-password`, `/forgot-password/sent`, `/forgot-password/reset`) marked as **shared shell — owned by AUTH-FE-01** and explicitly NOT placed under the `(admin)` route group.
- [ ] Each of the eleven admin sub-features has a dedicated folder under `apps/web/features/admin/<area>/` with the standard `api/`, `components/`, `lib/` subfolders (no business logic yet).
- [ ] A single Markdown file `apps/web/features/admin/ROUTES.md` lists every admin route with: URL, owning Story ID, owning Flow ID, target Wireframe Page name from USER_FLOWS.md.
- [ ] Admin shell sidebar lists all eleven areas grouped under: Identity & Access, Clinical Configuration, Reporting & Compliance, System Settings.
- [ ] Lint and typecheck pass on the scaffolding (`pnpm lint && pnpm typecheck`).
- [ ] No business logic, fetching, or page bodies are added — pages are placeholder components only.

## Dependencies

- None (this is the foundation ticket for the role).

## References

- TOR §1 — System Admin role definition.
- USER_STORIES.md Appendix A — Role-to-Story Coverage Matrix (Administrator row).
- USER_FLOWS.md §A1 (shared auth — owned by AUTH-FE-01), §A2, §A3, §A4, §B5, §Q, §S, §T.
