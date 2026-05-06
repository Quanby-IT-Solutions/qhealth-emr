# [SCH-BE-01] Clinic Slot Domain & Schema

**Role:** Scheduler
**Layer:** Backend
**Category:** Planning & Architecture (DB schema + contract scaffolding)
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Scheduler Clinic Template & Slot Setup

## Description

Persist individual clinic slot instances so they can be addressed by a stable UUID for blocking/unblocking and bookings. Today, slots are computed virtually inside `getAvailableSlots` (`apps/backend/src/modules/v1/scheduling/scheduling.service.ts:416-477`) which leaves no surface for the `PATCH /slots/:id` override required by the Epic. This ticket adds the `clinic_slots` table, back-reference from `appointments`, Zod contracts, and the corresponding Drizzle migration. No service or controller changes happen here — those are downstream tickets.

## Schema Changes

### New table — `packages/db/src/schema/scheduling.ts`

```ts
export const clinicSlots = createTable(
  "clinic_slots",
  t => ({
    id: t.uuid("id").primaryKey().defaultRandom(),
    clinicTemplateId: t
      .uuid("clinic_template_id")
      .notNull()
      .references(() => clinicTemplates.id, { onDelete: "cascade" }),
    facilityId: t
      .uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    clinicianStaffId: t
      .uuid("clinician_staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    slotDate: t.date("slot_date").notNull(),
    slotStartTime: t.time("slot_start_time").notNull(),
    slotEndTime: t.time("slot_end_time").notNull(),
    status: t
      .text("status")
      .notNull()
      .default("open")
      .$type<"open" | "blocked" | "booked" | "cancelled">(),
    blockReason: t.text("block_reason"),
    appointmentId: t
      .uuid("appointment_id")
      .references(() => appointments.id, { onDelete: "set null" }),
    blockedByStaffId: t
      .uuid("blocked_by_staff_id")
      .references(() => staffProfiles.id, { onDelete: "set null" }),
    blockedAt: t.timestamp("blocked_at"),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
    updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
  }),
  t => [
    uniqueIndex("clinic_slots_clinician_date_time_uniq").on(
      t.clinicianStaffId,
      t.slotDate,
      t.slotStartTime
    ),
    index("clinic_slots_template_id_idx").on(t.clinicTemplateId),
    index("clinic_slots_slot_date_idx").on(t.slotDate),
    index("clinic_slots_status_idx").on(t.status),
    index("clinic_slots_facility_id_idx").on(t.facilityId),
  ]
)
```

### `appointments` back-reference

Add `clinicSlotId` column on `appointments` (nullable, ON DELETE SET NULL) so a booked slot ↔ appointment is queryable both ways. Place under existing `clinicTemplateId` line.

### Contract schemas — `packages/contracts/src/modules/v1/scheduling/scheduling.schema.ts`

```ts
export const ClinicSlotStatusEnum = z.enum(["open", "blocked", "booked", "cancelled"])

export const ClinicSlotSchema = z.object({
  id: z.string().uuid(),
  clinicTemplateId: z.string().uuid(),
  facilityId: z.string().uuid(),
  clinicianStaffId: z.string().uuid(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: ClinicSlotStatusEnum,
  blockReason: z.string().nullable(),
  appointmentId: z.string().uuid().nullable(),
  blockedByStaffId: z.string().uuid().nullable(),
  blockedAt: dateOrString.nullable(),
  createdAt: dateOrString,
  updatedAt: dateOrString,
})
export type ClinicSlot = z.infer<typeof ClinicSlotSchema>

export const ListTemplateSlotsQuerySchema = z.object({
  id: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: ClinicSlotStatusEnum.optional(),
})

export const UpdateSlotSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["block", "unblock"]),
  reason: z.string().max(500).optional(),
})
```

## Acceptance Criteria

- [ ] `clinic_slots` table added in `packages/db/src/schema/scheduling.ts` with all columns, FKs, and indexes specified above.
- [ ] `appointments.clinicSlotId` nullable column added with ON DELETE SET NULL.
- [ ] Zod schemas (`ClinicSlotSchema`, `ClinicSlotStatusEnum`, `ListTemplateSlotsQuerySchema`, `UpdateSlotSchema`) added; types exported via `packages/contracts/src/index.ts` (already re-exports the scheduling barrel).
- [ ] `pnpm db:generate` produces a migration; the generated SQL is committed.
- [ ] `pnpm db:push` applies cleanly to a fresh DB, no errors.
- [ ] `pnpm typecheck` and `pnpm lint` are green across `packages/db` and `packages/contracts`.

## Dependencies

None. P0 — blocks every other backend ticket in this Epic.

## References

- USER_FLOWS.md §M1 — Clinic Template & Slot Setup.
- USER_STORIES.md §13 Story 13.1.
- Existing schema at `packages/db/src/schema/scheduling.ts:1-100` (extend, don't rewrite).
- Existing virtual slot computation at `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:416-477` (will be refactored in SCH-BE-05).
