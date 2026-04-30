# [BIL-FE-10] Billing — Wire Pages to oRPC + TanStack Query

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 12.1 – 12.7
**Flow Refs:** Flows L1 – L7

## Description

Wire every billing page (BIL-FE-03 through BIL-FE-09) to live oRPC contracts and TanStack Query hooks. Replace mock data and ensure mutation success handlers invalidate the correct query keys.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| Charge Capture | `apps/web/features/billing/charge-capture/api/charges.hooks.ts` | BIL-BE-02 |
| Invoice / Payment / Receipt | `invoice-payment/api/invoices.hooks.ts` | BIL-BE-03 |
| CF4 / eClaims | `cf4-eclaims/api/cf4.hooks.ts` | BIL-BE-04 |
| DRG / CF5 | `drg-cf5/api/drg.hooks.ts` | BIL-BE-05 |
| eSOA | `esoa/api/esoa.hooks.ts` | BIL-BE-06 |
| CEWS | `eligibility-cews/api/cews.hooks.ts` | BIL-BE-07 |
| Konsulta | `konsulta-capitation/api/konsulta.hooks.ts` | BIL-BE-08 |

## Acceptance Criteria

- [ ] All hooks use `orpc.<feature>.<method>.queryOptions()` / `mutationOptions()` patterns.
- [ ] Mutation onSuccess invalidates the right cache keys (e.g., generating CF4 invalidates the encounter's status query).
- [ ] Long-running submissions (eClaims) use polling or streaming via TanStack Query's `refetchInterval` until terminal state.
- [ ] Loading skeletons match design tokens; empty / error states use design system primitives.
- [ ] All audit-relevant mutations submit a reason field per the backend contract.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (Charge Capture, Invoices, eClaims status, Konsulta Tracker) with cookie pass-through.
- [ ] `pnpm typecheck` clean.

## Dependencies

- BIL-FE-03 through BIL-FE-09 implemented with mock data.
- All BIL-BE-* contracts published to `@repo/contracts`.

## References

- USER_FLOWS.md §L.
- Project CLAUDE.md — oRPC + TanStack Query patterns.
