# [MSW-FE-02] Social Worker — Assessment & CoE Issuance Pages

**Role:** Social Worker
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 12.8 — MSW Financial Evaluation & CoE Issuance
**Flow Refs:** Flow L8 (USER_FLOWS.md §L8)

## Description

Build the **MSW Assessment Page** and **CoE Issuance Page** from Flow L8. Capture income/family data, determine eligibility (Malasakit / Z-Benefits / Indigent), and issue a Certificate of Eligibility.

## Pages to Build

| Page | Route |
|------|-------|
| MSW Assessment Page | `/msw/encounters/[encounterId]/assessment` |
| CoE Issuance Page | `/msw/encounters/[encounterId]/coe` |
| Document Upload Drawer | overlay |

## Functional Requirements (per Flow L8)

- Assessment Page sections: Patient Identity (read-only from chart), Household, Income, Existing Coverage, Documents Uploaded, Eligibility Decision (Malasakit / Z-Benefits / Indigent / Not Eligible), Recommendation Notes.
- Multi-document upload with category tagging (Brgy. Indigency, ID, Income Proof).
- CoE Issuance Page: select CoE type (Malasakit / Z-Benefits / Indigent), assistance amount, signed-by selection (defaults to current MSW user), preview.
- CTA `Sign and Issue` — generates a PDF and attaches it to the encounter for billing.

## Acceptance Criteria

- [ ] Eligibility decision is required to enable CoE issuance.
- [ ] Document Upload Drawer accepts PDF, JPG, PNG, ≤10MB; validates and rejects other types.
- [ ] CoE preview reflects the form in real time.
- [ ] `Sign and Issue` triggers a confirmation dialog that shows what will be attached and to which billing record.
- [ ] After issuance, page locks the form, shows a `View PDF` link, and surfaces the issued CoE on the patient's billing context bar.
- [ ] Empty / loading / error states for both pages.
- [ ] Encounter Context Bar visible across both pages.

## Dependencies

- MSW-FE-01.
- ADM-FE-02 design system primitives.
- MSW-BE-02 (assessment + CoE service) for live wiring.

## References

- USER_FLOWS.md §L8.
- USER_STORIES.md §12 Story 12.8.
- TOR §1 — MSW role: liaison for Malasakit Centers.
