# [SCH-BE-03] Slot Generation Service

**Role:** Scheduler
**Layer:** Backend
**Category:** Integration & API Connectivity (service + scheduled job)
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Clinic Template & Slot Setup

## Description

Materialize `clinic_slots` rows from active `clinic_templates` for a rolling forward window so the new `GET /clinic-templates/:id/slots` (SCH-BE-04) and the refactored `getAvailableSlots` (SCH-BE-05) can read pre-computed rows. Generation must be idempotent (safe to re-run) and triggered both on a nightly cron and on demand from `createClinicTemplate` / `updateClinicTemplate` (SCH-BE-02).

## Scope

### New service — `apps/backend/src/modules/v1/scheduling/slot-generator.service.ts`

```ts
@Injectable()
export class SlotGeneratorService {
  // Insert all slots for `templateId` whose slotDate ∈ [fromDate, toDate]
  // and whose dayOfWeek matches the template's dayOfWeek. Idempotent.
  async generateSlotsForTemplate(
    templateId: string,
    fromDate: string, // YYYY-MM-DD
    toDate: string,
  ): Promise<{ inserted: number }>

  // Walk every active template and extend its window to today + windowDays.
  // Cron entry-point.
  async generateRollingWindow(): Promise<{ templates: number; inserted: number }>
}
```

Implementation notes:

- Reuse `timeToMinutes` / `minutesToTime` from `scheduling.service.ts:679-688` (lift them into a small module-private helper file or copy locally — avoid widening the service surface).
- For each candidate date, compute slot times: `startMinutes` to `endMinutes` step `slotDurationMinutes`; emit one row per step with `slotEndTime = slotStartTime + slotDurationMinutes`.
- Single bulk `db.insert(clinicSlots).values(rows).onConflictDoNothing()` per template — relies on `clinic_slots_clinician_date_time_uniq` from SCH-BE-01.
- Only generate for templates where `isActive = true`.

### Cron wiring

- Add `@nestjs/schedule` if not already present in `apps/backend/package.json`.
- Register `ScheduleModule.forRoot()` in `apps/backend/src/main.module.ts` (check first — surgical/encounters modules may already register it).
- Decorate `generateRollingWindow` with `@Cron("30 0 * * *")` (00:30 daily, server tz).
- Add `SCHEDULER_SLOT_WINDOW_DAYS` (default `60`) to `apps/backend/src/config/env.config.ts`.

### Tests

`slot-generator.service.spec.ts`:

- Single template, dayOfWeek = 1 (Monday), 08:00–10:00, 30 min slots → expect 4 slots per matching Monday.
- Idempotency: invoke twice with same range → second run inserts 0 rows.
- Inactive template: produces 0 rows.
- Partial overlap: existing booked slot in range is not duplicated and is left untouched.

## Acceptance Criteria

- [ ] `SlotGeneratorService` registered in `SchedulingModule` providers.
- [ ] `generateSlotsForTemplate` is idempotent (verified by test re-running same range).
- [ ] Cron job registered and visible via `nest --debug` or scheduler-internal log on boot.
- [ ] `SCHEDULER_SLOT_WINDOW_DAYS` validated through env schema.
- [ ] `pnpm --filter backend test slot-generator` is green.
- [ ] Generator does NOT touch slots whose status is `booked` or `blocked`.

## Dependencies

- SCH-BE-01 (schema).
- SCH-BE-02 calls into this service; expose the type so BE-02 can inject it.

## References

- Existing inline slot computation: `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:416-477`.
- Drizzle `onConflictDoNothing` usage: search `onConflictDoNothing` in repo for an existing example.
- Env config pattern: `apps/backend/src/config/env.config.ts`.
