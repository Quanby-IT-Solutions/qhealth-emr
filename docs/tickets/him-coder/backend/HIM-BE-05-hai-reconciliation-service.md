# [HIM-BE-05] HAI Surveillance & Reconciliation Service

**Role:** HIM Coder
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 15.4 — HAI Surveillance & Reconciliation
**Flow Refs:** Flow O4

## Description

Reconcile Nurse-tagged HAIs against finalized ICD-10 codes; produce AHSR-ready surveillance metrics.

## Endpoints (oRPC)

- `him.hai.list` — pending reconciliation.
- `him.hai.confirm` / `him.hai.reclassify` / `him.hai.dismiss` — capture decision.
- `him.hai.report` — params: period, ward; returns incidence rates per 1000 patient days.
- `him.hai.export` — PDF + CSV for AHSR.

## Functional Requirements

- Incidence formula: `(HAI cases / patient_days) × 1000` for the period.
- Reclassify lets the HIM coder change HAI type and write a reason.
- Dismiss requires a reason; dismissed tags are excluded from incidence.
- All reconciliations emit audit rows.

## Acceptance Criteria

- [ ] Report aggregates by ward and HAI type; integration tests verify the formula on a known dataset.
- [ ] Decision endpoints are idempotent on `(hai_tag_id)` — re-deciding overwrites with audit trail.
- [ ] Endpoints require `him.hai.read|write` permissions.
- [ ] AHSR export produces PDF + CSV with column headers matching the DOH template.

## Dependencies

- HIM-BE-01.
- Nursing HAI tagging module (out of scope — consumed read-only via shared schema).

## References

- USER_FLOWS.md §O4.
- USER_STORIES.md §15 Story 15.4.
- TOR §1, §3 — AHSR HAI metrics.
