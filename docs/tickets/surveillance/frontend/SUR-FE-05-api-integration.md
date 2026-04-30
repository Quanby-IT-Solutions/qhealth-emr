# [SUR-FE-05] Surveillance — Wire Pages to oRPC + TanStack Query

**Role:** Surveillance
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 16.1 – 16.3
**Flow Refs:** Flows P1 – P3

## Description

Wire surveillance pages to live oRPC contracts and TanStack Query hooks; replace mock data; ensure proper cache invalidation.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| PIDSR | `apps/web/features/surveillance/pidsr/api/pidsr.hooks.ts` | SUR-BE-02 |
| AHSR | `ahsr/api/ahsr.hooks.ts` | SUR-BE-03 |
| Mortality / Morbidity | `mortality-morbidity/api/mm.hooks.ts` | SUR-BE-04 |

## Acceptance Criteria

- [ ] Hooks use the project's oRPC + TanStack Query pattern.
- [ ] Mutation onSuccess invalidates the right queries (e.g., dismissing a PIDSR case removes it from the inbox count).
- [ ] Surveillance shell queue badges reflect live counts.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (PIDSR Alert Inbox, AHSR Dashboard, Mortality/Morbidity Report) with cookie pass-through.
- [ ] `pnpm typecheck` clean.

## Dependencies

- SUR-FE-02 through SUR-FE-04 implemented with mock data.
- SUR-BE-* contracts published.

## References

- USER_FLOWS.md §P.
