# [BIL-BE-01] Billing Domain — Module Architecture & Schema

**Role:** Billing Officer
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 12.1 – 12.7
**Flow Refs:** Flows L1 – L7

## Description

Plan the NestJS modules under `apps/backend/src/modules/v1/billing/`, the corresponding Drizzle schema, and the contract scaffolding in `packages/contracts/src/modules/v1/billing/`. No business logic in this ticket — only structure.

## Modules to Scaffold

```
apps/backend/src/modules/v1/billing/
├── charges/                (Story 12.1)
├── invoices/               (Story 12.2)
├── payments/               (Story 12.2)
├── cf4/                    (Story 12.3)
├── eclaims/                (Story 12.3)
├── drg/                    (Story 12.4)
├── esoa/                   (Story 12.5)
├── cews/                   (Story 12.6)
└── konsulta/               (Story 12.7)
```

## Schema Tables to Define

| Table | Purpose | Source |
|-------|---------|--------|
| `charges` | encounter_id, source (CPOE/MAR/OR/Ancillary/Manual), item_id, qty, unit_price, total | Story 12.1 |
| `service_catalog` | id, code, name, category, default_price | Story 12.1 |
| `invoices` | encounter_id, subtotal, discount, vat, total, status | Story 12.2 |
| `invoice_items` | invoice_id, charge_id snapshot fields | Story 12.2 |
| `payments` | invoice_id, method, amount, reference, hmo_provider, hmo_claim_no | Story 12.2 |
| `receipts` | payment_id, receipt_no, issued_at | Story 12.2 |
| `cf4_claims` | encounter_id, xml_uri, status, submitted_at, philhealth_ref | Story 12.3 |
| `cf4_status_log` | claim_id, status, changed_at, payload | Story 12.3 |
| `drg_mappings` | encounter_id, drg_code, confidence, manual_override_reason | Story 12.4 |
| `cf5_claims` | drg_id, xml_uri, status, philhealth_ref | Story 12.4 |
| `esoa_statements` | invoice_id, version, xml_uri, pdf_uri, sent_via | Story 12.5 |
| `cews_snapshots` | encounter_id, member_pin, status, benefit_balance, dependents_json, captured_at | Story 12.6 |
| `konsulta_activities` | patient_id, activity_type (FPE/Follow-up/Lab), date | Story 12.7 |

## Acceptance Criteria

- [ ] All module folders exist with NestJS scaffolding files.
- [ ] All tables declared in `packages/db/src/schema/`; foreign keys, indexes, constraints in place.
- [ ] Migrations apply cleanly against an empty DB (`pnpm db:push`).
- [ ] Contract files exist with placeholder routers.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01 (admin domain provides facility, master data, audit).

## References

- USER_FLOWS.md §L1 – §L7.
- USER_STORIES.md §12.
- TOR §2.13.
