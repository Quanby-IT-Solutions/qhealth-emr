# [SCH-FE-04] Scheduler — API Integration (oRPC migration)

**Role:** Scheduler
**Layer:** Frontend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1

## Description

The current scheduling hooks file (`apps/web/features/scheduling/api/scheduling.hooks.ts`, 407 lines) is hand-rolled `fetch` against `${API_BASE}/v1/scheduling/...` with locally-redefined types (`ScheduleTemplate`, `AppointmentSlot`, etc.). This drifts from the project's oRPC-first rule (`CLAUDE.md` → `tanstack-query-orpc` skill). Migrate every hook to use the typed `orpc` client and the contract types from `@repo/contracts`. Also adds the two new hooks for the slot endpoints from SCH-BE-04.

## Scope

### Migrate existing hooks

Each hook below is rewritten to use `orpc.scheduling.<route>.queryOptions(...)` / `.mutationOptions(...)` exactly as documented in the `tanstack-query-orpc` skill and the existing example at `apps/web/features/todos/api/todos.hooks.ts`:

- `useScheduleTemplatesQuery` → `orpc.scheduling.listClinicTemplates.queryOptions`
- `useCreateScheduleTemplateMutation` → `orpc.scheduling.createClinicTemplate.mutationOptions`
- `useUpdateScheduleTemplateMutation` → `orpc.scheduling.updateClinicTemplate.mutationOptions`
- `useAvailableSlotsQuery` → `orpc.scheduling.getAvailableSlots.queryOptions`
- `useAppointmentsQuery` → `orpc.scheduling.listAppointments.queryOptions`
- `useBookAppointmentMutation` → `orpc.scheduling.createAppointment.mutationOptions`
- `useCheckInMutation` → `orpc.scheduling.checkInAppointment.mutationOptions`
- `useUpdateAppointmentStatusMutation` → `orpc.scheduling.updateAppointmentStatus.mutationOptions`
- `useClinicQueueQuery` → `orpc.scheduling.getClinicQueue.queryOptions`
- `useUpdateEncounterQueueStatusMutation` → `orpc.scheduling.updateEncounterQueueStatus.mutationOptions`

### Add new hooks (for SCH-FE-03)

- `useTemplateSlotsQuery` → `orpc.scheduling.listTemplateSlots.queryOptions`
- `useUpdateSlotMutation` → `orpc.scheduling.updateSlot.mutationOptions`

### Type cleanup

- Delete every hand-rolled `interface ScheduleTemplate`, `AppointmentSlot`, `Appointment`, `UnifiedQueueEntry`, etc. (lines 39-174 of `scheduling.hooks.ts`).
- Replace consumer imports with `z.infer`-derived types from `@repo/contracts` (`ClinicTemplate`, `Appointment`, `UnifiedQueueEntry`, etc.).
- `useDeleteScheduleTemplateMutation` is currently exported but the contract has no DELETE route. Either remove the hook (and its consumers) or open a separate ticket to add the contract — out of scope here. Document the choice in the PR.

### Cache invalidation

- Use `orpc.scheduling.<route>.key()` for `invalidateQueries`, mirroring the todos hook pattern.

## Acceptance Criteria

- [ ] No raw `fetch(${API_BASE}/...)` calls remain in `scheduling.hooks.ts`.
- [ ] All hand-rolled type aliases removed; consumer files (`template-builder.tsx`, `clinic-queue.tsx`, etc.) compile against contract types.
- [ ] Two new hooks (`useTemplateSlotsQuery`, `useUpdateSlotMutation`) wired to the SCH-BE-04 endpoints.
- [ ] All scheduling pages (`/scheduling`, `/scheduling/templates`, `/scheduling/slots`, `/scheduling/book`, `/scheduling/queue`) load without runtime errors against a live backend.
- [ ] `useDeleteScheduleTemplateMutation` decision documented (kept as stub awaiting BE work, or removed with consumer impact noted).
- [ ] `pnpm --filter web typecheck` and `pnpm lint` green.

## Dependencies

- SCH-FE-02, SCH-FE-03 (consumers to verify after migration).
- SCH-BE-04 (live endpoints for the two new hooks).

## References

- Hook file to migrate: `apps/web/features/scheduling/api/scheduling.hooks.ts`.
- oRPC client setup: `apps/web/services/orpc/client.ts`.
- Reference migration target: `apps/web/features/todos/api/todos.hooks.ts`.
- Skill: `tanstack-query-orpc` (project skill).
