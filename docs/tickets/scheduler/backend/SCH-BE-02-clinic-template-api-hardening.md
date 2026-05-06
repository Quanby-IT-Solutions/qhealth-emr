# [SCH-BE-02] Clinic Template API Hardening

**Role:** Scheduler
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 13.1 — Clinic Template Setup
**Flow Refs:** Flow M1 — Clinic Template & Slot Setup

## Description

The `POST /clinic-templates` and `PUT /clinic-templates/:id` endpoints already exist (`apps/backend/src/modules/v1/scheduling/scheduling.service.ts:63-107` and `scheduling.controller.ts:27-43`) but lack input validation, audit emission, and the slot-generation hook required by the Epic's *"system auto-generates individual slots from the template"* line. This ticket closes those gaps without adding new routes.

## Scope

### Service-level validation (`scheduling.service.ts`)

- `createClinicTemplate`:
  - Reject when `endTime <= startTime` → `BadRequestException`.
  - Reject when `slotDurationMinutes` is not in `[5, 10, 15, 20, 30, 45, 60]`.
  - Verify the `clinicianStaffId` belongs to `facilityId` (join `staffProfiles.facilityId`); reject otherwise.
  - After insert, invoke `slotGenerator.generateSlotsForTemplate(template.id, today, today + windowDays)` (service from SCH-BE-03).
- `updateClinicTemplate`:
  - Same time/duration validation when those fields are in the patch.
  - On change to `startTime` / `endTime` / `slotDurationMinutes` / `dayOfWeek`: delete future `clinic_slots` rows where `slotDate >= today AND status = 'open'`, then regenerate. Preserve `booked` and `blocked` rows untouched.
  - On `isActive=false`: do not delete existing slots; subsequent generator runs will skip the template. On `isActive=true` re-flip: regenerate forward window.

### Audit events

Emit on every write via the existing audit pipeline (mirror what other modules do — search `audit.user.create` in repo for the pattern):

- `audit.scheduling.template.create`
- `audit.scheduling.template.update`

Include `templateId`, `actorStaffId`, and a diff of changed fields.

### Tests

`apps/backend/src/modules/v1/scheduling/scheduling.service.spec.ts`:

- Happy-path create writes row + triggers generator (mock generator).
- `endTime <= startTime` → throws BadRequestException.
- Invalid slot duration → throws BadRequestException.
- Clinician/facility mismatch → throws BadRequestException.
- Update that changes `startTime`: future open slots dropped, booked/blocked preserved (verify via mocked DB).

## Acceptance Criteria

- [ ] All validation rules above enforced at the service layer (not only Zod-level).
- [ ] Slot generator invoked on create + on regenerative update.
- [ ] Audit events emitted on both create and update with `actorStaffId` resolved from session.
- [ ] Unit tests added in `scheduling.service.spec.ts` covering each validation branch + the slot regeneration preservation behavior.
- [ ] No public contract change — `CreateClinicTemplateSchema` / `UpdateClinicTemplateSchema` unchanged.
- [ ] `pnpm --filter backend test scheduling` is green.

## Dependencies

- SCH-BE-01 (schema) — must be merged first.
- SCH-BE-03 (slot generator service) — this ticket calls into it; can land in parallel using a stub interface, but cannot ship without BE-03.

## References

- Existing service: `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:63-107`.
- Existing controller: `apps/backend/src/modules/v1/scheduling/scheduling.controller.ts:27-43`.
- Existing contract: `packages/contracts/src/modules/v1/scheduling/scheduling.contract.ts:30-58`.
- Audit pattern: search `audit.` in `apps/backend/src/modules/v1/admin/`.
