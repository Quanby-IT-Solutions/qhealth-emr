# ADM-10: Admin Dashboard QA, Seeds, And Test Coverage

## Summary

Add seed data, fixtures, and tests to make the Administrator dashboard meaningful and regression-safe.

## Problem

Without representative data and automated checks, the admin dashboard may render empty, misleading, or fragile states.

## Source References

- `packages/db/src/seed-dev.ts`
- `apps/web/vitest.config.ts`
- `apps/backend/src/modules/v1`

## Scope

- expand seed data to include:
  - inactive users
  - users missing primary roles
  - recent role changes
  - high-risk feature flag examples
  - incomplete facility profile example
  - failing integration example
  - audit and break-glass events
  - SLA/ARTA breach examples
- add frontend tests for dashboard loading, error, empty, and populated states
- add backend tests for admin dashboard summary aggregation

## Out of Scope

- full end-to-end matrix for every role in the system
- broad test refactors unrelated to the admin dashboard

## Acceptance Criteria

- seeded admin login shows meaningful dashboard data
- frontend tests cover key widget states and quick actions
- backend tests validate summary shape and critical edge cases
- typecheck and targeted tests pass for touched slices

## Implementation Notes

- keep seed scenarios intentional and tied to dashboard stories
- avoid creating noisy or unrealistic seed data that obscures validation

## Validation

- reseed and load `/dashboard` as Administrator
- run targeted web tests for dashboard widgets
- run targeted backend tests for admin dashboard summary service/controller
- run typecheck for touched packages/apps

## Dependencies

- ADM-03 through ADM-09 depending on final ticket sequence

## Risks

- if seed data does not reflect the actual widget logic, the dashboard may look complete in tests but weak in manual review

## Definition of Done

- admin dashboard renders meaningful demo data locally and has regression coverage