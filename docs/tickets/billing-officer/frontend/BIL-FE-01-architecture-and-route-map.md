# [BIL-FE-01] Billing — Architecture & Route Map

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Stories 12.1 – 12.7 (USER_STORIES.md §12)
**Flow Refs:** Flows L1 – L7 (USER_FLOWS.md §L)

## Description

Define the billing console route map and feature-folder layout in `apps/web/features/billing/` before page implementation begins. Cover seven Billing Officer stories: Charge Capture (12.1), Invoice & Payment (12.2), CF4 / eClaims (12.3), DRG / CF5 (12.4), eSOA (12.5), CEWS Eligibility (12.6), Konsulta Capitation (12.7).

## Deliverables

1. Route map under `/billing/*` for all pages enumerated in Flows L1 – L7.
2. Folder scaffolding under `apps/web/features/billing/` with sub-features:
   - `charge-capture/`
   - `invoice-payment/`
   - `cf4-eclaims/`
   - `drg-cf5/`
   - `esoa/`
   - `eligibility-cews/`
   - `konsulta-capitation/`
3. Billing shell layout (sidebar nav, encounter context bar with patient identifier, role badge).
4. RBAC route guard limiting routes to roles with the `billing.read` / `billing.write` permission.

## Acceptance Criteria

- [ ] Route group `(billing)` and shell layout exist under `apps/web/app/`.
- [ ] All seven sub-feature folders exist under `apps/web/features/billing/` with the standard `api/`, `components/`, `lib/` subfolders.
- [ ] `apps/web/features/billing/ROUTES.md` lists every route with story id, flow id, and target Wireframe Page name.
- [ ] Encounter Context Bar component shows MRN, patient name (masked when DPA flag is on), encounter type, status badge.
- [ ] `pnpm lint && pnpm typecheck` clean.
- [ ] No business logic; placeholders only.

## Dependencies

- ADM-FE-01 (depends on the admin shell pattern and design system).

## References

- USER_FLOWS.md §L1 – §L7.
- USER_STORIES.md §12.
- TOR §2.13 — Advanced RCM, eClaims & PhilHealth Integration.
