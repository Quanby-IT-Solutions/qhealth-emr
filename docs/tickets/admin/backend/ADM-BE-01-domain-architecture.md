# [ADM-BE-01] Admin Domain — Module Architecture & Schema Plan

**Role:** Admin
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 1.2, 1.3, 1.4, 2.5, 17.1, 17.2, 19.1, 19.2, 20.1, 20.2, 20.3
**Flow Refs:** All admin flows

## Description

Plan the NestJS modules under `apps/backend/src/modules/v1/admin/`, the corresponding Drizzle tables in `packages/db/src/schema/`, and the contracts in `packages/contracts/src/modules/v1/admin/`. No business logic is implemented in this ticket — only the directory layout, module declarations, and schema files (empty migrations are acceptable).

## Modules to Scaffold

```
apps/backend/src/modules/v1/admin/
├── users/                 (Story 1.2)
├── feature-flags/         (Story 1.3)
├── clinician-licenses/    (Story 1.4)
├── bor/                   (Story 2.5)
├── fhir-endpoints/        (Story 17.1)
├── terminology/           (Story 17.2)
├── sla/                   (Stories 19.1, 19.2)
├── facility/              (Story 20.1)
├── master-data/           (Story 20.2)
└── integrations/          (Story 20.3)
```

## Schema Tables to Define

| Table | Purpose | Source |
|-------|---------|--------|
| `users` (extend) | role, status, department | Story 1.2 |
| `roles`, `role_permissions` | RBAC matrix | Story 1.2 |
| `feature_flags` | flag, scope (staging/prod), value, updated_by | Story 1.3 |
| `clinician_licenses` | clinician_id, type (PRC/PTR/S2), number, issue, expiry, document_uri, status | Story 1.4 |
| `wards`, `rooms`, `beds`, `bed_status_history` | bed taxonomy from Flow B7 | Stories 2.5, 20.1 |
| `bed_census_daily` | midnight census per DOH formula | TOR §2.1 |
| `fhir_endpoints` | url, auth, resources, schedule | Story 17.1 |
| `fhir_exchange_log` | timestamp, resource, direction, status | Story 17.1 |
| `code_systems`, `code_set_versions`, `codes`, `code_mappings` | terminology | Story 17.2 |
| `sla_targets` | workflow, step, target_minutes, hard_cap | Story 19.1 |
| `workflow_status_log` | encounter_id, workflow, step, started_at, ended_at | Story 19.1 |
| `facility_profile` | name, license_no, level, accreditations | Story 20.1 |
| `departments` | name, type, head | Story 20.1 |
| `master_data_catalogs`, `master_data_items` | drug formulary, lab catalog, RVS, ICD-10 | Story 20.2 |
| `integrations`, `api_keys`, `webhook_endpoints` | ERP/LIS/PACS/Telemed/NHDR | Story 20.3 |

## Acceptance Criteria

- [ ] Every module folder exists with `*.module.ts`, `*.controller.ts`, `*.service.ts` placeholders following the project NestJS conventions.
- [ ] All Drizzle tables are declared in `packages/db/src/schema/` with primary keys, foreign keys, indexes, and timestamps.
- [ ] A migration is generated (`pnpm db:generate`) that applies cleanly against an empty database.
- [ ] Each contract file in `packages/contracts/src/modules/v1/admin/` exports an empty `oc.router({...})` placeholder per the project's oRPC pattern.
- [ ] `pnpm lint && pnpm typecheck && pnpm db:push` all succeed.
- [ ] No business logic, no controllers exposing endpoints — purely structural.

## Dependencies

- None.

## References

- Project CLAUDE.md — `apps/backend/` rules and `packages/db/` conventions.
- USER_STORIES.md Appendix A — Administrator stories.
- TOR §1, §2.1, §3, §4.1.
