# [SUR-BE-01] Surveillance Domain — Module Architecture & Schema

**Role:** Surveillance
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 16.1 – 16.3
**Flow Refs:** Flows P1 – P3

## Description

Plan the NestJS modules under `apps/backend/src/modules/v1/surveillance/`, the Drizzle schema, and contract scaffolding.

## Modules to Scaffold

```
apps/backend/src/modules/v1/surveillance/
├── pidsr/                  (Story 16.1)
├── ahsr/                   (Story 16.2)
└── mortality-morbidity/    (Story 16.3)
```

## Schema Tables

| Table | Purpose | Source |
|-------|---------|--------|
| `pidsr_alerts` | encounter_id, detection_source, disease, category (1/2), status, detected_at | Story 16.1 |
| `pidsr_submissions` | alert_ids[], transmitted_at, doh_ref, status | Story 16.1 |
| `ahsr_periods` | year, quarter, status (Open/Validating/Locked) | Story 16.2 |
| `ahsr_validation_issues` | period_id, issue_type, encounter_id, status | Story 16.2 |
| `ahsr_exports` | period_id, payload_uri, exported_at, exported_by | Story 16.2 |
| `mortality_morbidity_snapshots` | period, type (mort/morb), top10_json, generated_at | Story 16.3 |

## Acceptance Criteria

- [ ] Three module folders exist with NestJS scaffolding.
- [ ] Tables declared in `packages/db/src/schema/`; migrations apply cleanly.
- [ ] Contract files exist under `packages/contracts/src/modules/v1/surveillance/`.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01.

## References

- USER_FLOWS.md §P.
- USER_STORIES.md §16.
- TOR §3.
