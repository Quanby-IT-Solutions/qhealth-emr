# Scheduler — Clinic Template & Slot Management (Story 13.1 / Flow M1)

Tickets for the Scheduler M1 epic: define recurring clinic templates and override individual slots for holidays / clinician leave.

**Spec sources**

- USER_FLOWS.md §M1 — Clinic Template & Slot Setup
- USER_STORIES.md §13 Story 13.1 — Clinic Template Setup
- TOR §1 — Scheduler role definition

**Epic acceptance** (from the issue brief)

- Scheduler can define a recurring template per clinic and provider.
- System auto-generates individual bookable slots from the template.
- Individual slots can be blocked (holiday/leave) or re-opened.
- Blocked slots are not bookable by the appointment booking workflow.
- Template changes do not affect already-booked appointments.

## Scope of this Folder

In scope: Flow **M1** only (template page + slot management page + supporting backend).
Out of scope: Flow M2 (appointment booking + check-in) — already partially shipped, will get its own epic.

## Pre-existing State (informs every ticket)

| Component | Already shipped | Source |
|-----------|-----------------|--------|
| `clinic_templates` table | yes | `packages/db/src/schema/scheduling.ts` |
| POST/GET/PUT `/clinic-templates` | yes | `packages/contracts/src/modules/v1/scheduling/scheduling.contract.ts` + service/controller |
| Virtual `getAvailableSlots` (no slot table) | yes | `apps/backend/src/modules/v1/scheduling/scheduling.service.ts:416-477` |
| `template-builder.tsx` (raw UUID inputs) | yes | `apps/web/features/scheduling/components/template-builder.tsx` |
| Scheduler role bundle (`scheduling: [view, create, edit]`) | yes | `packages/db/src/seed-dev.ts:465` |
| Sidebar entry "Scheduling" | yes | `apps/web/features/app-shell/lib/navigation.ts:171-182` |
| `clinic_slots` table (per-instance materialization) | **no** | This epic |
| `GET /clinic-templates/:id/slots` | **no** | SCH-BE-04 |
| `PATCH /slots/:id` (block/unblock) | **no** | SCH-BE-04 |
| Slot Management calendar page | **no** | SCH-FE-03 |

## Tickets

### Backend

| ID | Title | Depends On |
|----|-------|------------|
| [SCH-BE-01](backend/SCH-BE-01-domain-and-schema.md) | Clinic Slot Domain & Schema | — |
| [SCH-BE-02](backend/SCH-BE-02-clinic-template-api-hardening.md) | Clinic Template API Hardening | BE-01 |
| [SCH-BE-03](backend/SCH-BE-03-slot-generation-service.md) | Slot Generation Service | BE-01 |
| [SCH-BE-04](backend/SCH-BE-04-slot-management-api.md) | Slot Management API (`GET /clinic-templates/:id/slots`, `PATCH /slots/:id`) | BE-01, BE-03 |
| [SCH-BE-05](backend/SCH-BE-05-availability-and-booking-integration.md) | Availability & Booking Integration | BE-04 |

### Frontend

| ID | Title | Depends On |
|----|-------|------------|
| [SCH-FE-01](frontend/SCH-FE-01-architecture-and-route-map.md) | Architecture & Route Map | — |
| [SCH-FE-02](frontend/SCH-FE-02-clinic-template-page.md) | Clinic Template Page (refactor) | FE-01 |
| [SCH-FE-03](frontend/SCH-FE-03-slot-management-page.md) | Slot Management Calendar Page | FE-01, BE-04 |
| [SCH-FE-04](frontend/SCH-FE-04-api-integration.md) | oRPC migration of scheduling hooks | FE-02, FE-03, BE-04 |

## Dependency Graph

```
SCH-BE-01 ─┬─> SCH-BE-02
           ├─> SCH-BE-03 ──> SCH-BE-04 ──> SCH-BE-05
           └─> SCH-BE-04

SCH-FE-01 ─┬─> SCH-FE-02 ─┐
           └─> SCH-FE-03 ─┴─> SCH-FE-04
                              ^
                         SCH-BE-04
```

FE-01/02/03 can be developed against mock data; FE-04 wires them to the live backend after BE-04 ships.

## End-to-End Verification

After all 9 tickets land:

```bash
pnpm db:push              # apply clinic_slots migration
pnpm dev:backend
pnpm dev:web

# 1. Login as scheduler@qhealth.local → /scheduling/templates
# 2. Create template: clinic + clinician + Mon/Wed/Fri + 08:00-17:00 + 30 min
# 3. Verify slots auto-generated:
#    pnpm db:studio  (open clinic_slots table for the new template id)
# 4. Navigate /scheduling/slots, pick the template, block one date for "Holiday"
# 5. Hit getAvailableSlots for that date → empty array
# 6. Attempt booking on a blocked slot → 409 ConflictException

pnpm typecheck && pnpm lint
pnpm --filter backend test scheduling
```
