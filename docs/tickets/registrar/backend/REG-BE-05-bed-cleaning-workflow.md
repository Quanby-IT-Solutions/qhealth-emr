# [REG-BE-05] Bed Cleaning Workflow

**Role:** Registrar
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 2.9
**Flow Refs:** Flow B7

## Description

Wire the bed lifecycle for post-discharge cleaning: auto-transition the bed to `dirty_for_cleaning` when a gate pass is released, expose a `mark-cleaned` endpoint for housekeeping, and persist the cleaning log + bed-status history for census reporting.

## Schema

- Add `"dirty_for_cleaning"` to `BedStatusEnum` (`packages/contracts/src/modules/v1/beds/beds.schema.ts:28`). Generate the pg enum migration.
- `bed_cleaning_log` table (declared in REG-BE-01) is consumed here.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/api/v1/beds/:id/mark-cleaned` | Housekeeping confirms cleaning. Bed status `dirty_for_cleaning` → `available`. Sets `cleanedAt = now`, `cleanedBy = session.staffProfileId`. |
| `GET` | `/api/v1/beds/:id/status-history` | Returns ordered timeline from `bedStatusHistory`. |
| `GET` | `/api/v1/beds/cleaning-queue` | List of beds currently in `dirty_for_cleaning`, sorted by `dirtiedAt` ascending. |

## Auto-Transition Listener

Subscribe to `gate-pass.released` (REG-BE-04) inside the beds module:

1. Resolve `bedId` from the encounter.
2. Transition `occupied` → `dirty_for_cleaning`. Write to `bedStatusHistory`.
3. Insert a `bed_cleaning_log` row with `dirtiedAt`, `dirtiedByEncounterId`.
4. Emit `bed.dirtied` event (consumed by REG-BE-06 for housekeeping notification).

The existing discharge code (`encounters.service.ts:1008-1014`) that sets bed to `available` must be removed — bed release now happens here via the gate-pass event.

## RBAC

- `mark-cleaned` requires permission `housekeeping.mark_cleaned` (role `housekeeping`, see REG-BE-06).
- `cleaning-queue` requires `housekeeping.view_queue`.

## Acceptance Criteria

- [ ] Pg enum migration adds `dirty_for_cleaning` without dropping the existing enum.
- [ ] On `gate-pass.released`, the linked bed transitions to `dirty_for_cleaning` and a `bed_cleaning_log` row is created.
- [ ] `PATCH /beds/:id/mark-cleaned` only works when current status is `dirty_for_cleaning`; otherwise 400.
- [ ] Mark-cleaned transition records `cleanedAt` and `cleanedBy`, writes to `bedStatusHistory`, and updates the matching `bed_cleaning_log` row.
- [ ] `GET /beds/:id/status-history` returns ascending timeline with all transitions.
- [ ] `bed.dirtied` event is emitted on dirty transition.
- [ ] The old auto-`available` block in `encounters.service.ts` is removed and integration test confirms bed is `dirty_for_cleaning` (not `available`) right after discharge but before gate-pass release.

## Dependencies

- REG-BE-01 (enum + tables)
- REG-BE-03 (discharge stops releasing the bed)
- REG-BE-04 (event source)

## References

- USER_FLOWS.md §B7
- USER_STORIES.md §2.9
- TOR §2.20 (ARTA Flow 5)
- Existing code: `apps/backend/src/modules/v1/beds/beds.service.ts:227`, `packages/db/src/schema/core.ts:297`
