# [MSW-BE-01] MSW Domain — Module Architecture & Schema

**Role:** Social Worker
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 12.8 – 12.11
**Flow Refs:** Flows L8 – L11

## Description

Plan the NestJS modules under `apps/backend/src/modules/v1/msw/`, the Drizzle schema, and contract scaffolding. No business logic here.

## Modules to Scaffold

```
apps/backend/src/modules/v1/msw/
├── assessments/          (Story 12.8)
├── coe/                  (Story 12.8)
├── annex-signatures/     (Story 12.9)
├── malasakit/            (Story 12.10)
└── ancillary-clearance/  (Story 12.11)
```

## Schema Tables

| Table | Purpose | Source |
|-------|---------|--------|
| `msw_assessments` | encounter_id, household, income, eligibility_decision, recommendation | Story 12.8 |
| `msw_documents` | assessment_id, category, uri, content_hash | Story 12.8 |
| `coe_certificates` | assessment_id, type, amount, issued_by, pdf_uri, signed_at | Story 12.8 |
| `annex_signatures` | encounter_id, annex_type (A/B), patient_signature_uri, witness_signature_uri, pdf_uri, signed_at | Story 12.9 |
| `malasakit_cases` | encounter_id, source (DSWD/PCSO/DOH-MAIFIP), status, amount_granted, reference_no | Story 12.10 |
| `malasakit_status_log` | case_id, from_status, to_status, actor, note, changed_at | Story 12.10 |
| `ancillary_clearance` | order_id, encounter_id, applied_coverages_json, status, cleared_by, cleared_at | Story 12.11 |

## Acceptance Criteria

- [ ] All five module folders exist with NestJS scaffolding.
- [ ] All tables in `packages/db/src/schema/`; migrations apply cleanly.
- [ ] Contract files under `packages/contracts/src/modules/v1/msw/` exist with placeholder routers.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01.

## References

- USER_FLOWS.md §L8 – §L11.
- USER_STORIES.md §12.
- TOR §1 — MSW responsibilities.
