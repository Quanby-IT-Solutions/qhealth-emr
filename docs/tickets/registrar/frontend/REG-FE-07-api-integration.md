# [REG-FE-07] API Integration — oRPC Hooks & Cache Strategy

**Role:** Registrar
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 2.6, Story 2.9
**Flow Refs:** Flow B6, Flow B7

## Description

Wire all Registrar and Housekeeping pages to the oRPC contracts. Define TanStack Query hooks, mutation cache invalidation rules, and server-side prefetch helpers for SSR pages.

## Hooks to Implement

### `apps/web/features/registrar/api/clearances.hooks.ts`

- `useDischargeClearancesQuery(encounterId)` — `staleTime: 30s`.
- `useRecordClearanceMutation()` — invalidates `clearances.list(encounterId)` and `encounters.detail(encounterId)`.
- `useRevokeClearanceMutation()` — same invalidation set.

### `apps/web/features/registrar/api/gate-pass.hooks.ts`

- `useGatePassQuery(encounterId)` — `staleTime: 5min` (gate pass rarely changes after issuance).
- `useCreateGatePassMutation()` — invalidates `gate-pass.byEncounter(encounterId)` and `beds.list`, `beds.statusHistory(bedId)`.
- `useMarkGatePassPrintedMutation()`.

### `apps/web/features/registrar/api/discharge.hooks.ts`

- Extend the existing `useDischargeEncounterMutation` (in `features/encounters/api`) to also invalidate the clearance list. No new hook — update the existing one.

### `apps/web/features/housekeeping/api/housekeeping.hooks.ts`

- `useCleaningQueueQuery()` — `staleTime: 10s` (frequently changing).
- `useMarkBedCleanedMutation()` — optimistic update: remove the bed from the queue immediately; on error restore.
- `useBedStatusHistoryQuery(bedId)` — `staleTime: 30s`.

## SSR Prefetch Helpers

For each page, add a prefetch helper that the server component calls before rendering:

- Discharge Processing Page: prefetch encounter detail + clearances + death-report status.
- Gate Pass Release Page: prefetch encounter detail + gate-pass-by-encounter.
- Bed Status Page: prefetch first page of beds.
- Housekeeping Queue Page: prefetch cleaning queue.

Use the existing `services/orpc/orpc-server.ts` server client.

## Realtime

- Bed Status Page and Housekeeping Queue Page subscribe to SSE notifications via the existing notifications client.
- On `bed.dirtied`: invalidate `beds.cleaningQueue` and `beds.list`.
- On `bed.status_changed`: invalidate `beds.statusHistory(bedId)` and `beds.list`.

## Acceptance Criteria

- [ ] All hooks live in their feature's `api/` folder, no shared file.
- [ ] No barrel files introduced (per repo rules).
- [ ] Mutation cache invalidation is exhaustive — verified by clicking through the flow and watching React Query devtools.
- [ ] Optimistic update on mark-cleaned rolls back correctly on simulated API failure.
- [ ] SSR prefetch helpers hydrate the page with no client-side refetch on initial load.
- [ ] Realtime subscription wires keep the queue and bed-status pages in sync across two browser tabs.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- REG-FE-01 (folders)
- All backend tickets (REG-BE-02 … REG-BE-06) define the contracts being consumed.

## References

- USER_FLOWS.md §B6, §B7
- USER_STORIES.md §2.6, §2.9
- Existing setup: `apps/web/services/orpc/`, `apps/web/services/tanstack-query/`
