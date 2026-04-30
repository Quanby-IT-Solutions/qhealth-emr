# [AUD-FE-04] Auditor — Wire Pages to oRPC + TanStack Query

**Role:** Auditor
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 1.6
**Flow Refs:** Flow A6

## Description

Wire auditor pages to live oRPC contracts and TanStack Query hooks. The auditor surface is read-mostly; write operations are limited to the review actions on break-glass events.

## Wiring Targets

| Page Group | Hooks File | Backend Ticket |
|-----------|------------|----------------|
| Audit Log | `apps/web/features/auditor/audit-log/api/audit.hooks.ts` | AUD-BE-02 |
| Break-Glass | `break-glass-review/api/break-glass.hooks.ts` | AUD-BE-03 |

## Acceptance Criteria

- [ ] Hooks use the project's oRPC + TanStack Query pattern.
- [ ] Audit log queries support cursor-based pagination for performance on large datasets.
- [ ] Break-glass review mutations invalidate the inbox count and the affected event detail.
- [ ] All review mutations submit a reason field per the contract.
- [ ] SSR prefetch via `services/orpc/orpc-server.ts` for list pages (Audit Log Dashboard, Break-Glass Inbox) with cookie pass-through.
- [ ] `pnpm typecheck` clean.

## Dependencies

- AUD-FE-02, AUD-FE-03 implemented with mock data.
- AUD-BE-* contracts published.

## References

- USER_FLOWS.md §A6.
