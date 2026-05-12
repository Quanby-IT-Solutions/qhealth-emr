# [HIM-BE-01] HIM Domain — Module Architecture & Schema

**Role:** HIM Coder
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 15.1 – 15.4
**Flow Refs:** Flows O1 – O4

## Description

Plan the NestJS modules under `apps/backend/src/modules/v1/him/`, the Drizzle schema, and contract scaffolding.

## Modules to Scaffold

```
apps/backend/src/modules/v1/him/
├── deficiencies/        (Story 15.1)
├── coding/              (Story 15.2)
├── records-requests/    (Story 15.3)
└── hai/                 (Story 15.4)
```

## Schema Tables

| Table | Purpose | Source |
|-------|---------|--------|
| `chart_deficiencies` | encounter_id, type, owner_user_id, status, opened_at, resolved_at, age_bucket | Story 15.1 |
| `deficiency_notifications` | deficiency_id, channel, sent_at | Story 15.1 |
| `encounter_codes` | encounter_id, code_system, code, position (primary/secondary), source_note_id, version, signed_by, signed_at | Story 15.2 |
| `code_versions` | encounter_id, version, replaced_at, reason | Story 15.2 |
| `records_requests` | patient_id, requester_relation, dpa_consent_uri, status | Story 15.3 |
| `records_request_items` | request_id, document_type, generated_uri | Story 15.3 |
| `records_release_audit` | request_id, document_type, released_at, recipient | Story 15.3 |
| `hai_tags` | encounter_id, hai_type (VAP/BSI/UTI/SSI), tagged_by_nurse_id, tagged_at, evidence_json, status | Story 15.4 (consumed from nursing module — read-only here) |
| `hai_reconciliations` | hai_tag_id, decision (confirmed/reclassified/dismissed), new_type, reason, decided_by, decided_at | Story 15.4 |

## Acceptance Criteria

- [ ] Four module folders exist with NestJS scaffolding.
- [ ] Tables declared in `packages/db/src/schema/`; migrations apply cleanly.
- [ ] Contract files exist under `packages/contracts/src/modules/v1/him/`.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01.

## References

- USER_FLOWS.md §O.
- USER_STORIES.md §15.
- TOR §1 — HIM Coder.
