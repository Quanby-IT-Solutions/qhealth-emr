# [ADM-FE-02] Admin Console — Design System Foundation

**Role:** Admin
**Layer:** Frontend
**Category:** Frontend Design & UI/UX
**Priority:** P0
**Story Refs:** Stories 1.2 – 20.3 (foundational, applies to every admin page)
**Flow Refs:** All admin flows (A2, A3, A4, B5, Q1, Q2, S1, S2, T1, T2, T3 — USER_FLOWS.md)

## Description

Establish the design tokens, layout primitives, and reusable UI patterns that every admin page will rely on. Build on Tailwind CSS v4 + shadcn/ui (already installed). Output is a documented set of components in `apps/web/features/admin/components/` and `apps/web/core/components/` plus a reference page demonstrating each pattern.

The admin pages call out in the flows for several repeating patterns: dashboards with KPI tiles (BOR, SLA), data tables with filters and badges (Users, Licenses, Master Data), multi-step wizards (Add User, Add License), toggle lists (Feature Flags), tabular catalog editors (Master Data), and signed-status indicators (License Verified / Pending).

## Deliverables

1. Admin Shell layout: collapsible sidebar, top app bar with facility badge and role tag, breadcrumb row, content area.
2. Reusable `AdminPageHeader` (title, description, primary CTA slot).
3. Reusable `KpiTile` (label, value, delta indicator).
4. Reusable `StatusBadge` variants: Verified, Pending, Active, Inactive, Expired, Restricted.
5. `MultiStepWizard` shell (Profile → Role → Permissions pattern from Flow A2).
6. `DataTableShell` wrapping shadcn DataTable with filter bar, search, pagination, and export-CTA slot.
7. `ToggleListItem` for feature flag rows.
8. Reference route `/admin/_design` (dev-only) renders every primitive for visual QA.

## Acceptance Criteria

- [ ] All listed components live under `apps/web/features/admin/components/` (page-specific) or `apps/web/core/components/` (shared) and are typed with no `any`.
- [ ] Tailwind utilities use `size-*` for square dimensions per the project rule (Tailwind size utility guidelines).
- [ ] Components meet WCAG 2.1 AA color contrast and have keyboard navigation support (Tab order, Enter/Space activation).
- [ ] Status colors are defined as semantic tokens in `apps/web/core/styles/` not raw hex.
- [ ] `/admin/_design` page renders without error in dark and light mode and is excluded from production builds.
- [ ] Storybook entries (or a simple gallery page) exist for each primitive with at least three states (default, loading, error/disabled).
- [ ] No barrel files (`index.ts`) inside `apps/web/features/admin/components/` per project rule.

## Dependencies

- ADM-FE-01 must be merged.

## References

- USER_FLOWS.md §A2 (multi-step wizard pattern), §B5 (KPI dashboard), §A4 (status badges), §A3 (toggle list).
- Project CLAUDE.md — Tailwind size utility and Shadcn UI conventions.
