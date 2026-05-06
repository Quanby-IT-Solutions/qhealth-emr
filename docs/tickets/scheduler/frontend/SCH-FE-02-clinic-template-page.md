# [SCH-FE-02] Scheduler — Clinic Template Page

**Role:** Scheduler
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Wireframe: Clinic Template Page

## Description

The Epic acceptance reads: *"Scheduler can define a recurring template per clinic and provider"* with a *"form to select clinic, provider, days of week, operating hours, slot duration."* The current implementation at `apps/web/features/scheduling/components/template-builder.tsx` accepts raw UUIDs in text inputs, allows only one day per submission, and does not use `react-hook-form` or Zod. This ticket refactors that component in place — no parallel component is added.

## Scope

### Refactor target

`apps/web/features/scheduling/components/template-builder.tsx`

### Changes

- **Selectors instead of UUID inputs**:
  - Clinic (facility) selector: new hook `useClinicsQuery()` that lists facilities the user can act on. For now, scope to the user's own facility from `useMyProfile()`; future multi-facility schedulers can extend.
  - Clinician selector: new hook `useStaffClinicianListQuery({ facilityId })` that lists `staff_profiles` whose role is in the clinical bundle (Physician, Surgeon, Dietitian, etc.). Display label = `users.name`.
  - Both hooks live in `apps/web/features/scheduling/api/scheduling.hooks.ts` and are migrated to oRPC by SCH-FE-04 (this ticket may use an interim fetch helper).
- **Form library**: switch the dialog body to `useForm` + `zodResolver` from `react-hook-form`, with the schema imported from `@repo/contracts` (`CreateClinicTemplateSchema`). Co-locate any UI-only Zod refinements in this same file (no `*.schema.ts` file).
- **Multi-day support**: replace the single `dayOfWeek` `Select` with seven shadcn `Checkbox` items (Sun–Sat). On submit, fire one mutation per checked day. Server-side composite unique on `(clinicianStaffId, dayOfWeek, clinicName)` already prevents duplicates.
- **Validation rules**:
  - At least one day selected.
  - `endTime > startTime`.
  - `slotDurationMinutes ∈ {5, 10, 15, 20, 30, 45, 60}`.
- **UX states**: loading skeleton for table; empty state copy *"No templates configured yet."*; error state with retry; toasts on save/delete.
- **Edit dialog**: pre-fills selectors and time fields. The day checkboxes display as read-only (you cannot retroactively change a template's day; user must delete and recreate).

### Page wiring

`apps/web/app/(site)/scheduling/templates/page.tsx`:

- Add the permission gate from SCH-FE-01.
- Render the refactored `<TemplateBuilder />` once the user is authorized.

## Acceptance Criteria

- [ ] Clinic and clinician fields are dropdowns populated from queries; raw UUID `Input` boxes are gone.
- [ ] Form uses `react-hook-form` + Zod via `zodResolver(CreateClinicTemplateSchema.extend(...))`.
- [ ] Day-of-week checkbox group; submitting with three days checked creates three template rows.
- [ ] Validation errors render below each field per shadcn `<Form>` pattern; submit is blocked until valid.
- [ ] Save success → dialog closes, toast shown, table refetched.
- [ ] Delete confirmation dialog retained; dialog focus-traps and closes on Esc.
- [ ] No `index.ts` barrel inside `features/scheduling/`; no `*.types.ts` files.
- [ ] `pnpm --filter web typecheck` and `pnpm lint` green.

## Dependencies

- SCH-FE-01 (route shell + permission gate).
- Backend dependency for selectors: existing `staff_profiles` and `facilities` queries (no new BE endpoint needed for this ticket; selector data sources may pre-date this Epic).

## References

- File to refactor: `apps/web/features/scheduling/components/template-builder.tsx`.
- Page route: `apps/web/app/(site)/scheduling/templates/page.tsx`.
- Schema source: `packages/contracts/src/modules/v1/scheduling/scheduling.schema.ts:117-126`.
- USER_FLOWS.md §M1 step 4 — *"Define recurring schedule (days, hours, slot duration)"*.
