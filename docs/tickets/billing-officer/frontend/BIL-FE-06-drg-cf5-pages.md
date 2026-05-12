# [BIL-FE-06] Billing — DRG Mapping & CF5 (Shadow Billing) Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 12.4 — DRG Shadow Billing (CF5)
**Flow Refs:** Flow L4 (USER_FLOWS.md §L4)

## Description

Build the **DRG Mapping Page** and **CF5 Page** from Flow L4. The system suggests a DRG group from coded diagnoses + procedures; the Biller verifies the mapping and generates CF5 for submission.

## Pages to Build

| Page | Route |
|------|-------|
| DRG Mapping Page | `/billing/encounters/[encounterId]/drg` |
| CF5 Page | `/billing/encounters/[encounterId]/drg/cf5` |

## Functional Requirements (per Flow L4)

- DRG Mapping Page: left = coded diagnoses (ICD-10) and procedures (RVS); right = suggested DRG group with confidence score and rationale.
- CTA `Confirm Mapping` requires either accepting the suggestion or selecting an alternative DRG.
- CF5 Page mirrors the CF4 page UX but with CF5-specific fields and XML schema; includes the DRG code prominently in the header.
- Submit, track status (timeline), and resubmit support.

## Acceptance Criteria

- [ ] DRG mapping panel shows the top-3 candidate DRGs with confidence scores and a reason explanation per candidate.
- [ ] Manual override requires a free-text justification recorded with the submission.
- [ ] CF5 XML preview is XSD-validated and reflects edits in real time.
- [ ] `Confirm Mapping` is disabled while ICD-10 coding is incomplete (cross-references HIM coding state, Story 15.2).
- [ ] Submission timeline matches the CF4 flow; resubmissions are differentiated visually.
- [ ] Encounter Context Bar shows the DRG code once mapped.

## Dependencies

- BIL-FE-01, BIL-FE-02.
- BIL-BE-05 (DRG mapping + CF5 service) for live wiring.

## References

- USER_FLOWS.md §L4.
- USER_STORIES.md §12 Story 12.4.
- TOR §2.13 — DRG Shadow Billing (CF5).
