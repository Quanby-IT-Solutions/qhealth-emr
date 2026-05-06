# [SCH-FE-01] Scheduler — Architecture & Route Map

**Role:** Scheduler
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Wireframe Pages: Clinic Template Page, Slot Management Page

## Description

Lock down the page tree, sidebar wiring, and permission gates for the Scheduler M1 surface. The route group `/scheduling/*` and a sidebar entry already exist (`apps/web/features/app-shell/lib/navigation.ts:171-182`); this ticket only adds the Slot Management route and confirms the Scheduler role bundle reaches both pages.

## Pages

| Page | Route | Owning Ticket |
|------|-------|---------------|
| Clinic Template (existing, refactored) | `/scheduling/templates` | SCH-FE-02 |
| Slot Management (new) | `/scheduling/slots` | SCH-FE-03 |

Out of scope for M1 but already routed: `/scheduling/book`, `/scheduling/queue`.

## Functional Requirements

- Add directory `apps/web/app/(site)/scheduling/slots/` with a placeholder `page.tsx` that renders the Slot Management feature component (implemented in SCH-FE-03).
- Confirm the existing "Scheduling" sidebar entry (`navigation.ts:171-182`) shows for the Scheduler role bundle (`scheduling: [view, create, edit]` in `packages/db/src/seed-dev.ts:465`). No code change expected — only document the verification step.
- Add a sub-nav inside the `/scheduling/*` shell that links the two M1 pages. Pattern: copy the secondary nav approach from `apps/web/app/(site)/admin/` shell.
- Each page must use the project permission-gate pattern (mirror `apps/web/app/(site)/scheduling/page.tsx:10-25`):
  ```ts
  const { data: profile } = useMyProfile()
  const permSet = new Set(
    profile?.activeRole.permissions.map(p => `${p.module}:${p.action}`) ?? []
  )
  const canView = permSet.has("scheduling:view")
  ```
- 403 fallback: render `<UnauthorizedPanel />` (existing component) when the gate fails.

## Acceptance Criteria

- [ ] `/scheduling/templates` and `/scheduling/slots` resolve to a real route handler (placeholder content allowed pending SCH-FE-02/03).
- [ ] Sub-nav between Templates and Slots is present and visually consistent with admin shell sub-nav.
- [ ] Logging in as `scheduler@qhealth.local` shows "Scheduling" in the primary sidebar; clicking lands on `/scheduling/templates`.
- [ ] Logging in as a role without `scheduling:view` (e.g., `auditor@qhealth.local`) does NOT see the Scheduling sidebar entry.
- [ ] No `*.types.ts` files in the feature folder; no barrel `index.ts` files.
- [ ] `pnpm --filter web typecheck` and `pnpm lint` are green.

## Dependencies

None (pure routing + nav).

## References

- USER_FLOWS.md §M1.
- Route group: `apps/web/app/(site)/scheduling/`.
- Sidebar config: `apps/web/features/app-shell/lib/navigation.ts:171-182`.
- Permission hook: `apps/web/features/app-shell/api/rbac.hooks.ts` (`useMyProfile`).
