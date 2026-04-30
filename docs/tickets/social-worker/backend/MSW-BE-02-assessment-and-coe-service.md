# [MSW-BE-02] MSW Assessment & CoE Issuance Service

**Role:** Social Worker
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 12.8 — Financial Evaluation & CoE Issuance
**Flow Refs:** Flow L8

## Description

Service for capturing the MSW assessment and issuing the Certificate of Eligibility.

## Endpoints (oRPC)

- `msw.assessments.upsert` — create/update assessment for an encounter.
- `msw.assessments.attachDocument`.
- `msw.assessments.get`, `.list`.
- `msw.coe.issue` — input: assessmentId, type, amount; generates PDF, attaches to billing.
- `msw.coe.list` — by patient or encounter.
- `msw.coe.get`.

## Functional Requirements

- Assessment is locked once a CoE is issued; subsequent edits require an explicit `revoke and revise` flow that voids the prior CoE.
- CoE PDF generated server-side, stored via the project's object storage facade.
- CoE issuance emits an event consumed by Billing to apply the assistance to the invoice.

## Acceptance Criteria

- [ ] Assessment fields validated server-side (income > 0, household size ≥ 1).
- [ ] CoE issuance is transactional: PDF generated, row persisted, billing event emitted in one transaction.
- [ ] Revoke flow voids the prior CoE atomically; downstream billing is notified.
- [ ] Endpoints require `msw.assessment.read|write` and `msw.coe.read|write` permissions.
- [ ] All writes audited.
- [ ] Unit and integration tests for the upsert / issue / revoke paths.

## Dependencies

- MSW-BE-01.

## References

- USER_FLOWS.md §L8.
- USER_STORIES.md §12 Story 12.8.
- TOR §1 — MSW Malasakit liaison.
