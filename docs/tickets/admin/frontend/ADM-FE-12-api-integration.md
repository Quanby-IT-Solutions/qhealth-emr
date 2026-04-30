# [ADM-FE-12] Admin — Wire All Pages to oRPC + TanStack Query

**Role:** Admin
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 1.2, 1.3, 1.4, 2.5, 17.1, 17.2, 19.1, 19.2, 20.1, 20.2, 20.3
**Flow Refs:** Every admin flow (USER_FLOWS.md §A2, §A3, §A4, §B5, §Q1, §Q2, §S1, §S2, §T1, §T2, §T3)

## Description

Wire every admin page (built in ADM-FE-03 through ADM-FE-11) to the backend via oRPC contracts (`@repo/contracts`) and TanStack Query hooks. Replace mock data with real queries and mutations. Backend tickets ADM-BE-* must be merged before each corresponding wiring step.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| User Management | `apps/web/features/admin/user-management/api/users.hooks.ts` | ADM-BE-03 |
| Feature Flags | `feature-flags/api/flags.hooks.ts` | ADM-BE-04 |
| Clinician Licenses | `clinician-licenses/api/licenses.hooks.ts` | ADM-BE-05 |
| BOR / Census | `bor-census/api/bor.hooks.ts` | ADM-BE-06 |
| FHIR Endpoints | `fhir-endpoints/api/fhir.hooks.ts` | ADM-BE-07 |
| Terminology | `terminology/api/terminology.hooks.ts` | ADM-BE-08 |
| SLA Config | `sla/api/sla-config.hooks.ts` | ADM-BE-09 |
| SLA Dashboard | `sla/api/sla-dashboard.hooks.ts` | ADM-BE-10 |
| Facility / Master Data / Integrations | `facility-setup/api/`, `master-data/api/`, `integrations/api/` | ADM-BE-11, ADM-BE-12 |

## Acceptance Criteria

- [ ] Every page uses TanStack Query via the project's oRPC pattern (`orpc.<feature>.<method>.queryOptions()` / `mutationOptions()`).
- [ ] Mutation success handlers invalidate the correct query keys via `queryClient.invalidateQueries({ queryKey: orpc.<feature>.key() })`.
- [ ] Loading skeletons match the design tokens; empty and error states use the design-system primitives.
- [ ] Server Components are used wherever the data does not need client interactivity (Next.js App Router conventions).
- [ ] Hooks are typed end-to-end — no `any` and no manual response interfaces.
- [ ] All audit-relevant mutations (license verification, feature flag toggle, master data deprecate, API key rotation) attach the audit reason field expected by the backend contract.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (User Management List, Clinician Licenses, Feature Flags, Audit-relevant lists) with cookie pass-through so the first paint renders authenticated data.
- [ ] `pnpm typecheck` is clean across `apps/web`.

## Dependencies

- All ADM-FE-03 through ADM-FE-11 pages exist with mock data.
- All ADM-BE-* contracts published to `@repo/contracts`.

## References

- Project CLAUDE.md — `apps/web` rules: oRPC + TanStack Query patterns.
- USER_FLOWS.md — full admin flow set.
