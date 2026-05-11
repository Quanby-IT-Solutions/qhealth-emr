# [REG-BE-01] Registrar Domain — Module Architecture & Schema

**Role:** Registrar
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Story 2.6, Story 2.9
**Flow Refs:** Flow B6, Flow B7

## Description

Plan the NestJS modules, Drizzle schema additions, and contract scaffolding required to support administrative discharge, gate-pass release, and post-discharge bed cleaning. No business logic in this ticket — only structure. Subsequent tickets (REG-BE-02 … REG-BE-06) fill in the logic.

## Modules to Scaffold

```
apps/backend/src/modules/v1/
├── discharge-clearances/        (NEW — Story 2.6)
├── gate-passes/                 (NEW — Story 2.6, Flow B6)
├── housekeeping/                (NEW — Story 2.9, Flow B7)
├── encounters/                  (EXTEND — discharge finalization)
├── beds/                        (EXTEND — dirty_for_cleaning, mark-cleaned)
└── notifications/               (EXTEND — housekeeping topic)
```

Each new module gets `*.module.ts`, `*.controller.ts`, `*.service.ts`, and a `*.spec.ts` shell.

## Schema Tables to Define

| Table | Purpose | Source |
|-------|---------|--------|
| `discharge_clearances` | `encounter_id`, `type` (pharmacy \| nurse \| billing), `cleared_by` (staffProfileId), `cleared_at`, `notes`. Unique on (encounter_id, type). | Story 2.6 / Flow B6 step 3–4 |
| `gate_passes` | `id`, `encounter_id`, `qr_token` (signed), `issued_by`, `issued_at`, `printed_at` (nullable), `delivered_via` (`print` \| `qr` \| `both`) | Story 2.6 / Flow B6 step 8–9 |
| `bed_cleaning_log` | `bed_id`, `dirtied_at`, `dirtied_by_encounter_id`, `cleaned_at` (nullable), `cleaned_by` (staffProfileId, nullable) | Story 2.9 / Flow B7 |

## Schema Extensions

- `BedStatusEnum` (`packages/contracts/src/modules/v1/beds/beds.schema.ts:28`) — add `"dirty_for_cleaning"` value alongside existing `"cleaning"`.
- `encounters` table (`packages/db/src/schema/...`) — add nullable columns:
  - `lengthOfStayMinutes` (integer)
  - `deathRateClassification` (`gross` \| `net` \| null)
- Death-reporting schema (`packages/db/src/schema/death-reporting.ts`) — confirm whether `deathDatetime` is sufficient for ≤48h calc against `admissionDatetime`. No new field needed if so; document in ticket.

## Contract Scaffolding

```
packages/contracts/src/modules/v1/
├── discharge-clearances/        (NEW)
├── gate-passes/                 (NEW)
└── housekeeping/                (NEW)
```

Each with `*.schema.ts` (Zod) and `*.contract.ts` (oRPC contract router). Register in `v1.contract.ts`.

## Acceptance Criteria

- [ ] All new module folders exist with NestJS scaffolding files registered in `v1.module.ts`.
- [ ] All new tables declared in `packages/db/src/schema/`; foreign keys, indexes, unique constraints in place.
- [ ] `dirty_for_cleaning` added to `BedStatusEnum` and the corresponding pg enum migration generated.
- [ ] `lengthOfStayMinutes` and `deathRateClassification` columns added to `encounters` schema.
- [ ] `pnpm db:generate` produces a clean migration; `pnpm db:push` applies cleanly against an empty DB.
- [ ] Contract files exist with placeholder routers and are exported from `packages/contracts/src/modules/v1/v1.contract.ts`.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01 equivalent (facility, master data, audit) must exist — already present.
- REG-BE-06 will add a `housekeeping` RBAC role; this ticket only scaffolds the module folder.

## References

- USER_FLOWS.md §B6, §B7
- USER_STORIES.md §2.6, §2.9
- TOR §2.4 (ADT), §2.20 (ARTA Citizen's Charter)
- spec:28b4882f-7a94-402b-94c3-e4ddc178e026
