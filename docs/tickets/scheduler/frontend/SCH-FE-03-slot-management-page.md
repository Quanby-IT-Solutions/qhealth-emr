# [SCH-FE-03] Scheduler — Slot Management Page

**Role:** Scheduler
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup (override holidays / leaves)
**Flow Refs:** Flow M1 — Wireframe: Slot Management Page

## Description

Build the calendar view that lets a Scheduler block or unblock individual slots — the per-instance overrides for holidays or clinician leave called out by the Epic acceptance: *"Individual slots can be blocked (holiday/leave) or re-opened. Blocked slots are not bookable."* Wired to the new `GET /clinic-templates/:id/slots` and `PATCH /slots/:id` endpoints from SCH-BE-04.

## Scope

### New files

- `apps/web/app/(site)/scheduling/slots/page.tsx` — route entry; permission gate; renders the feature component.
- `apps/web/features/scheduling/components/slot-management.tsx` — main component.
- `apps/web/features/scheduling/components/slot-block-dialog.tsx` — block-reason dialog.
- New hooks in `apps/web/features/scheduling/api/scheduling.hooks.ts`:
  - `useTemplateSlotsQuery({ templateId, fromDate, toDate, status? })`
  - `useUpdateSlotMutation()` (block/unblock with `action`).

### Layout

- Two-column shell on desktop, stacked on mobile.
- Left rail: template selector. Reuses the table from SCH-FE-02 (single-select rows) or a `Select` driven by `useScheduleTemplatesQuery({ clinicianId? })`.
- Main panel:
  - Month calendar built on `apps/web/core/components/ui/calendar.tsx` (existing react-day-picker primitive).
  - Date cells get a status pill: green dot for "all open", red for "any blocked", grey for "all booked".
  - Selecting a date renders a slot list below the calendar with one row per slot: time range, status badge, action button(s).

### Slot row actions

- Status `open` → "Block" button → opens `<SlotBlockDialog>` capturing reason → fires `useUpdateSlotMutation({ action: 'block', reason })`.
- Status `blocked` → "Unblock" button → fires `useUpdateSlotMutation({ action: 'unblock' })` (no dialog, optimistic).
- Status `booked` → no action button; row shows patient name (from joined data via `getAppointment` or a lightweight join — backend may extend `ClinicSlotSchema` with `patientName` later; for now display "Booked").

### Cache & UX

- TanStack Query: invalidate `templateSlots` query on mutation success.
- Optimistic update: flip row status on dispatch, roll back on error.
- 409 from the backend (booked slot) → toast "This slot has an appointment and cannot be blocked."
- Loading skeleton, empty state ("No slots in this date range — adjust template?"), error retry.

### Accessibility

- `<Calendar>` keyboard nav already supplied by react-day-picker — verify ENTER selects a date.
- Block dialog: `role="dialog"`, `aria-labelledby` on title, focus trap, Esc to close.
- Slot list: each action button has accessible label like `aria-label="Block 09:00 slot on 2026-05-12"`.

## Acceptance Criteria

- [ ] Calendar renders the active month; navigating to next/prev month re-queries with new `fromDate`/`toDate`.
- [ ] Selecting a date renders the slots-of-day list with correct status badges.
- [ ] Block flow: reason captured, slot status updates optimistically, list re-flows.
- [ ] Unblock flow: one-click, optimistic update.
- [ ] Attempting to block a booked slot shows the 409 toast and rolls back optimistic state.
- [ ] Empty/loading/error states all rendered.
- [ ] Page lives at `/scheduling/slots` and is gated by `scheduling:edit` permission.
- [ ] No `index.ts` barrel inside `features/scheduling/`; no `*.types.ts` files.
- [ ] `pnpm --filter web typecheck` and `pnpm lint` green.

## Dependencies

- SCH-FE-01 (route shell).
- SCH-BE-04 (real `listTemplateSlots` and `updateSlot` endpoints) — page can be developed against mock data first.

## References

- USER_FLOWS.md §M1 step 6 — *"Open Slot Management Page to override holidays / leaves"*.
- Calendar primitive: `apps/web/core/components/ui/calendar.tsx`.
- Existing TanStack Query + oRPC pattern: `apps/web/features/scheduling/api/scheduling.hooks.ts`.
