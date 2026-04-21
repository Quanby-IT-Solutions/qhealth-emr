# ADM-04: Build Access Governance Dashboard Widgets

## Summary

Implement Administrator dashboard widgets for user lifecycle, role governance, and permission risk.

## Problem

The TOR assigns identity lifecycle and permission governance to System Admin, but the dashboard currently exposes only placeholder cards.

## Source References

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `apps/web/features/admin/components/users-table.tsx`
- `apps/web/features/admin/components/user-detail.tsx`
- `apps/web/features/admin/components/permission-matrix.tsx`

## Scope

- add widgets for:
  - active users
  - inactive users
  - users missing primary role
  - users with multi-facility memberships
  - recent role changes
  - recent permission matrix changes
  - high-risk permission grants
- add deep links into:
  - `/admin/users`
  - `/admin/users/new`
  - `/admin/roles`

## Out of Scope

- full redesign of user detail and role pages
- audit trail deep analytics

## Acceptance Criteria

- Administrator dashboard shows live access-governance metrics
- widgets handle loading, error, and empty states
- high-risk conditions are clearly elevated visually
- counts reconcile with source list/detail pages
- widgets link to the correct admin surfaces

## Implementation Notes

- prefer compact summary cards plus one recent-activity list
- avoid duplicating heavy table UIs on the dashboard
- include empty-state messaging for fresh facilities

## Validation

- compare dashboard counts to `/admin/users` and `/admin/roles`
- frontend tests for populated and empty states
- verify keyboard navigation and focus states

## Dependencies

- ADM-03

## Risks

- recent-change data may require audit aggregation if not already exposed

## Definition of Done

- Administrator dashboard exposes real access governance signals with working links