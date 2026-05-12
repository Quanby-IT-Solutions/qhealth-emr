# [HIM-FE-05] HIM — HAI Surveillance & Reconciliation Pages

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 15.4 — HAI Surveillance & Reconciliation
**Flow Refs:** Flow O4 (USER_FLOWS.md §O4)

## Description

Build the **HAI Reconciliation Worklist** and **HAI Surveillance Report Page** from Flow O4. Review and reconcile Nurse-tagged HAIs (VAP, BSI, UTI, SSI) against finalized ICD-10 codes for AHSR submission.

## Pages to Build

| Page | Route |
|------|-------|
| HAI Reconciliation Worklist | `/him/hai` |
| HAI Surveillance Report Page | `/him/hai/report` |

## Functional Requirements (per Flow O4)

- Worklist columns: Patient, Encounter, HAI Type (VAP/BSI/UTI/SSI), Tagged-by Nurse, Tagged Date, Linked ICD-10 Code, Reconciliation Status (Pending / Confirmed / Reclassified / Dismissed).
- Detail drawer: full evidence (cultures, imaging links), CTA `Confirm`, `Reclassify` (change HAI type), `Dismiss` (require reason).
- Surveillance Report Page: aggregated incidence rates per ward, per type, per period; downloadable for AHSR.

## Acceptance Criteria

- [ ] Worklist supports filtering by HAI type, ward, date range.
- [ ] Reclassify drawer shows the original tag vs the new tag side-by-side.
- [ ] Dismiss requires a reason and writes an audit row.
- [ ] Report page renders incidence per 1000 patient days (AHSR formula) with a tooltip explaining the formula.
- [ ] Export produces an AHSR-ready file (PDF + CSV).
- [ ] Empty / loading / error states.

## Dependencies

- HIM-FE-01, ADM-FE-02.
- HIM-BE-05 (HAI service) for live wiring.

## References

- USER_FLOWS.md §O4.
- USER_STORIES.md §15 Story 15.4.
- TOR §1 — HIM Coder responsibility for HAI tracking.
- TOR §3 — AHSR HAI surveillance metrics.
