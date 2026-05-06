# [SCH-BE-04] Slot Management API

**Role:** Scheduler
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Clinic Template & Slot Setup (override slots for holiday/leave)

## Description

Expose the two new endpoints called for by the Epic: list materialized slots for a template and override an individual slot (block/unblock for holidays or clinician leave). Both routes operate on the `clinic_slots` table from SCH-BE-01.

## Endpoints (oRPC)

### `listTemplateSlots` — `GET /clinic-templates/{id}/slots`

```ts
.input(ListTemplateSlotsQuerySchema) // { id, fromDate, toDate, status? }
.output(z.array(ClinicSlotSchema))
```

Behavior:
- If the requested `[fromDate, toDate]` range extends past the materialized window, lazily call `slotGenerator.generateSlotsForTemplate(id, fromDate, toDate)` before reading.
- Return rows ordered by `slotDate ASC, slotStartTime ASC`, optionally filtered by `status`.

Guard: `@RequirePermission("scheduling", "view")`.

### `updateSlot` — `PATCH /slots/{id}`

```ts
.input(UpdateSlotSchema) // { id, action: 'block' | 'unblock', reason? }
.output(ClinicSlotSchema)
```

Behavior:
- Load slot by `id`; throw 404 if missing.
- If `action='block'`:
  - 409 ConflictException if `status='booked'`.
  - Set `status='blocked'`, `blockReason=input.reason ?? null`, `blockedByStaffId=session.staffId`, `blockedAt=now`.
- If `action='unblock'`:
  - If `status='open'`, return current row (no-op).
  - If `status='blocked'`, set `status='open'`, null out `blockReason` / `blockedByStaffId` / `blockedAt`.
  - If `status='booked'` or `cancelled`, 409.
- Emit audit event `audit.scheduling.slot.block` / `audit.scheduling.slot.unblock` with `slotId`, `actorStaffId`, `templateId`, `slotDate`, `slotStartTime`.

Guard: `@RequirePermission("scheduling", "edit")`.

## Files to Modify

- `packages/contracts/src/modules/v1/scheduling/scheduling.contract.ts`: append `listTemplateSlots` + `updateSlot` to `schedulingContract`.
- `apps/backend/src/modules/v1/scheduling/scheduling.controller.ts`: add the two `@Implement` handlers, mirroring the existing decoration pattern at lines 19-43.
- `apps/backend/src/modules/v1/scheduling/scheduling.service.ts`: add `listTemplateSlots` and `updateSlot` methods.
- `apps/backend/src/modules/v1/scheduling/scheduling.module.ts`: register `SlotGeneratorService` injection if not already wired.

## Acceptance Criteria

- [ ] Both routes registered, OpenAPI surface visible at `/api/openapi`.
- [ ] Lazy-generate path covered: requesting a range past the materialized window produces the missing rows transparently.
- [ ] Blocking a `booked` slot returns 409 `ConflictException` with a clear message.
- [ ] Unblocking an already-`open` slot is idempotent (returns the row, no DB write).
- [ ] Audit events emitted on both block and unblock paths with `actorStaffId`.
- [ ] Unit tests cover: 200 list, 200 block, 200 unblock, 409 booked-block, 404 missing slot.
- [ ] Integration test: create template → list slots for next 7 days → block one slot → list again → confirm status change.

## Dependencies

- SCH-BE-01 (schema), SCH-BE-03 (generator).

## References

- Existing controller decoration: `apps/backend/src/modules/v1/scheduling/scheduling.controller.ts:19-43`.
- Existing service shape: `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:63-107`.
- USER_FLOWS.md §M1 — "Open Slot Management Page to override holidays / leaves".
