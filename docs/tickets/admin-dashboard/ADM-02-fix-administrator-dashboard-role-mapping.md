# ADM-02: Fix Administrator Dashboard Role Mapping And Dashboard Registry

## Summary

Ensure the actual Administrator role resolves to the intended admin dashboard widget set.

## Problem

The dashboard widget registry currently maps `system admin`, while the seeded role name is `Administrator`. This likely causes `/dashboard` to fall back to generic widgets.

## Source References

- `apps/web/app/(site)/dashboard/page.tsx`
- `apps/web/features/app-shell/lib/navigation.ts`
- `packages/db/src/seed-dev.ts`

## Scope

- fix role-to-widget mapping for the Administrator role
- normalize mapping so capitalization and display-label drift do not break the dashboard
- preserve fallback widget behavior for unknown roles

## Out of Scope

- building real dashboard data
- redesigning the dashboard layout

## Acceptance Criteria

- logging in as Administrator yields the admin dashboard widget set
- dashboard mapping is resilient to case differences
- fallback behavior still works for unconfigured roles
- no other role's widget mapping regresses

## Implementation Notes

- current mapping is name-based; consider permission-driven mapping if feasible within ticket scope
- keep the change minimal if a full permission-driven model is deferred

## Validation

- login as Administrator and confirm admin widget set appears
- login as at least one non-admin role and confirm expected widgets remain unchanged
- run web typecheck/tests for touched files

## Dependencies

- ADM-01 recommended before final verification, but not required for implementation

## Risks

- if widget selection remains name-driven, future role renames may reintroduce brittleness

## Definition of Done

- Administrator reliably resolves to admin-specific widgets on `/dashboard`