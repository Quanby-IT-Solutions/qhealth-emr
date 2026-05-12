# [HIM-FE-06] HIM — Wire Pages to oRPC + TanStack Query

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 15.1 – 15.4
**Flow Refs:** Flows O1 – O4

## Description

Wire HIM pages to live oRPC contracts and TanStack Query hooks; replace mock data; ensure cache invalidation and audit reasons are passed.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| Deficiencies | `apps/web/features/him/deficiency-tracking/api/deficiency.hooks.ts` | HIM-BE-02 |
| ICD-10 Coding | `icd10-coding/api/coding.hooks.ts` | HIM-BE-03 |
| Records Issuance | `records-issuance/api/records.hooks.ts` | HIM-BE-04 |
| HAI Reconciliation | `hai-reconciliation/api/hai.hooks.ts` | HIM-BE-05 |

## Acceptance Criteria

- [ ] All hooks use the project's oRPC + TanStack Query pattern.
- [ ] Mutation onSuccess invalidates the right queries (e.g., signing coding invalidates the encounter status, the worklist counts, and the CF4 generator).
- [ ] HIM shell queue badges reflect live counts.
- [ ] Loading / empty / error states use design system primitives.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (Deficiency Worklist, ICD-10 Coding queue, Records Requests, HAI Reconciliation Worklist) with cookie pass-through.
- [ ] `pnpm typecheck` clean.

## Dependencies

- HIM-FE-02 through HIM-FE-05 implemented with mock data.
- All HIM-BE-* contracts published.

## References

- USER_FLOWS.md §O.
