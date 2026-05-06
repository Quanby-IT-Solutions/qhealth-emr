# [SCH-BE-05] Availability & Booking Integration

**Role:** Scheduler
**Layer:** Backend
**Category:** Integration & API Connectivity (refactor)
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup (acceptance: "Blocked slots are not bookable")
**Flow Refs:** Flow M1, Flow M2

## Description

Wire the existing availability / booking paths to the new `clinic_slots` table so that blocked slots are not returned as available and so that bookings consume a real slot row. This closes the loop on the Epic acceptance criterion: *"Blocked slots are not bookable by the appointment booking workflow."*

## Scope

### Refactor `getAvailableSlots` (`scheduling.service.ts:416-477`)

Replace the inline computation with a query against `clinic_slots`:

```ts
const slots = await db
  .select({
    id: clinicSlots.id,
    time: clinicSlots.slotStartTime,
    available: sql<boolean>`${clinicSlots.status} = 'open'`,
  })
  .from(clinicSlots)
  .where(
    and(
      eq(clinicSlots.clinicianStaffId, clinicianId),
      eq(clinicSlots.slotDate, input.date),
      sql`${clinicSlots.status} IN ('open', 'booked')` // hide cancelled/blocked from picker
    )
  )
  .orderBy(clinicSlots.slotStartTime)
```

Update `TimeSlotSchema` (or extend the response) to include `slotId` so the frontend can pass it to `createAppointment` (next step).

### Refactor `createAppointment` (`scheduling.service.ts:272-330`)

- Extend `CreateAppointmentSchema` (in `scheduling.schema.ts:173-183`): `clinicSlotId: z.string().uuid().optional()`. When provided, it overrides the legacy `(clinicianStaffId, appointmentDate, appointmentTime)` lookup.
- Wrap the body in `db.transaction(async tx => { … })`:
  1. `SELECT … FROM clinic_slots WHERE id = $1 FOR UPDATE`.
  2. 409 if `status !== 'open'`.
  3. Insert appointment with `clinicSlotId = slot.id`, `clinicTemplateId = slot.clinicTemplateId`, `clinicianStaffId`, `appointmentDate = slot.slotDate`, `appointmentTime = slot.slotStartTime`.
  4. `UPDATE clinic_slots SET status='booked', appointmentId=appt.id WHERE id = slot.id`.
- Keep backwards-compat: when `clinicSlotId` is absent, find or lazily create the slot row by `(clinicianStaffId, date, time)` then run the same transactional path. If no template exists for that day, fall back to today's behavior of bare-insert.

### Refactor `updateAppointmentStatus` (`scheduling.service.ts:380-410`)

- On status transition to `cancelled` or `no_show`, flip the linked `clinic_slots.status` from `booked` back to `open` and null `appointmentId`. Keep within a transaction.

### Tests

- Unit: blocking a slot then calling `getAvailableSlots` — slot does not appear.
- Unit: booking an `open` slot atomically marks it `booked`; second concurrent booking attempt throws 409 (use `Promise.all` with two `createAppointment` calls in a test).
- Unit: cancelling an appointment flips the slot back to `open`.

## Acceptance Criteria

- [ ] `getAvailableSlots` reads from `clinic_slots`; no `slotsPerDay` math remains in the method.
- [ ] `createAppointment` is transactional; concurrent attempts on the same slot — only one wins.
- [ ] Cancelled/no-show appointments release their slot back to `open`.
- [ ] `getAvailableSlots` response includes `slotId` for each slot.
- [ ] Existing OPD queue and check-in tests still pass (no regression).
- [ ] `pnpm --filter backend test scheduling` is green; new contention test added.

## Dependencies

- SCH-BE-01 (schema), SCH-BE-03 (so production has rows to read), SCH-BE-04 (block path that this ticket consumes).

## References

- `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:272-330` (createAppointment).
- `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:380-410` (updateAppointmentStatus).
- `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:416-477` (getAvailableSlots).
- USER_FLOWS.md §M1 closing line: *"Slots become bookable"*.
