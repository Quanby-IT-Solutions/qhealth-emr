# ENC-BE-003 — Queue Number Auto-Assignment

**Status:** Open
**Type:** Backend
**Priority:** High
**Depends on:** None
**Blocks:** ENC-BE-001 (queue assignment called during encounter creation)

---

## Summary

Auto-assign a per-clinic, per-day queue number to OPD encounters at creation time. Queue numbers reset to 1 each calendar day per clinician.

---

## Scope

### Rules

- Applies to `encounterType = 'outpatient'` only
- Queue scope: `clinicianStaffId` + `date(admissionDatetime)` within the same `facilityId`
- Assignment: `MAX(queueNumber) + 1` for that scope, or `1` if no encounters exist today
- Set `queueStatus = 'waiting'` on creation
- ER and IPD encounters: `queueNumber = null`, `queueStatus = null`

### Where to Add

`apps/backend/src/modules/v1/encounters/encounters.service.ts` — extract into a private helper `assignQueueNumber()`, called from `create()` after consent check, before insert.

---

## Technical Context

### DB Columns

`packages/db/src/schema/core.ts` → `encounters`:
- `queueNumber` — integer, nullable
- `queueStatus` — enum (`waiting | in_progress | completed`), nullable
- `clinicianStaffId` — UUID, nullable (present on OPD)
- `admissionDatetime` — timestamp (use as the date anchor)

### Query Pattern

```typescript
import { max, and, eq, sql } from "drizzle-orm"
import { encounters } from "@repo/db/schema"

async assignQueueNumber(
  db: DBType,
  facilityId: string,
  clinicianStaffId: string,
): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [result] = await db
    .select({ maxQueue: max(encounters.queueNumber) })
    .from(encounters)
    .where(
      and(
        eq(encounters.facilityId, facilityId),
        eq(encounters.clinicianStaffId, clinicianStaffId),
        sql`${encounters.admissionDatetime} >= ${today}`,
        sql`${encounters.admissionDatetime} < ${tomorrow}`,
      )
    )

  return (result?.maxQueue ?? 0) + 1
}
```

### Concurrency Note

For clinics with high volume, two simultaneous registrations may get the same `MAX` value. If strict uniqueness per clinic per day is required, consider:
- DB unique constraint on `(facilityId, clinicianStaffId, queueNumber, date(admissionDatetime))` — and retry on conflict
- Or use a DB sequence per clinic (overkill for typical facility volume)

For now, `MAX + 1` approach is acceptable; document the known race condition here.

---

## Acceptance Criteria

- [ ] OPD encounter gets `queueNumber = 1` when first encounter of the day for that clinician
- [ ] Second OPD encounter for same clinician same day gets `queueNumber = 2`
- [ ] Queue resets to `1` after midnight (new calendar day)
- [ ] ER and IPD encounters have `queueNumber = null`
- [ ] `queueStatus` is set to `waiting` for OPD on creation
- [ ] Different clinicians in the same facility have independent queue counters
