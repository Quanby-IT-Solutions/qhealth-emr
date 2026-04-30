# [BIL-BE-05] DRG Mapping & CF5 Service

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 12.4 — DRG Shadow Billing (CF5)
**Flow Refs:** Flow L4

## Description

Suggest a DRG group based on coded ICD-10 diagnoses and RVS procedures, persist the mapping with a confidence score and (optional) override reason, and assemble CF5 for submission.

## Endpoints (oRPC)

- `billing.drg.suggest` — input: encounterId; returns top-3 DRGs with confidence and rationale.
- `billing.drg.confirm` — store the chosen DRG with optional override reason.
- `billing.cf5.generate`, `billing.cf5.preview`, `billing.cf5.submit`, `billing.cf5.statusPoll`, `billing.cf5.resubmit`.

## Functional Requirements

- DRG suggestion uses a rule-based mapping table seeded from PhilHealth DRG groupers (master data, ADM-BE-11).
- Manual override is allowed only with a reason; recorded in `drg_mappings.manual_override_reason`.
- CF5 XML schema differs from CF4 — both validators live as separate XSD files in `apps/backend/src/modules/v1/billing/cf5/xsd/`.
- Confidence score is a deterministic calculation documented in the service.

## Acceptance Criteria

- [ ] Suggest endpoint never returns more than 3 candidates and never returns a deprecated DRG code.
- [ ] Override reason is required when the chosen DRG differs from the top-1 suggestion.
- [ ] CF5 XSD validation blocks `submit` on failure.
- [ ] All writes audited.
- [ ] Endpoints require `billing.drg.read|write` and `billing.cf5.read|write` permissions.
- [ ] Unit tests cover suggestion ranking and rationale generation; integration test covers the full submit flow.

## Dependencies

- BIL-BE-01, BIL-BE-03, BIL-BE-04 (CF claim base patterns).
- HIM coding (ICD-10 + RVS) — HIM-BE-03 for ICD-10; surgical RVS lives outside this scope.

## References

- USER_FLOWS.md §L4.
- USER_STORIES.md §12 Story 12.4.
- TOR §2.13 — DRG Shadow Billing (CF5).
