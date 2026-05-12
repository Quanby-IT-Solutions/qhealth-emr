# [MSW-FE-06] Social Worker — Wire Pages to oRPC + TanStack Query

**Role:** Social Worker
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 12.8 – 12.11
**Flow Refs:** Flows L8 – L11

## Description

Wire MSW pages (MSW-FE-02 through MSW-FE-05) to oRPC contracts and TanStack Query hooks. Replace mock data with real queries / mutations and ensure cache invalidation is correct.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| Assessment + CoE | `apps/web/features/msw/assessment-coe/api/assessment.hooks.ts` | MSW-BE-02 |
| Annex Signatures | `annex-signatures/api/annex.hooks.ts` | MSW-BE-03 |
| Malasakit | `malasakit-tracking/api/malasakit.hooks.ts` | MSW-BE-04 |
| Ancillary Clearance | `ancillary-clearance/api/clearance.hooks.ts` | MSW-BE-05 |

## Acceptance Criteria

- [ ] All hooks use the project's oRPC + TanStack Query pattern.
- [ ] Mutation onSuccess invalidates the right query keys.
- [ ] MSW shell queue badges reflect live counts.
- [ ] Loading / empty / error states use design-system primitives.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (Malasakit Tracking, Ancillary Clearance Queue, Signed Forms Archive) with cookie pass-through.
- [ ] `pnpm typecheck` clean.

## Dependencies

- MSW-FE-02 through MSW-FE-05 implemented with mock data.
- All MSW-BE-* contracts published.

## References

- USER_FLOWS.md §L.
