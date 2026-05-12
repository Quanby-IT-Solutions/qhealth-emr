# [SUR-FE-04] Surveillance — Mortality & Morbidity Report Pages

**Role:** Surveillance
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 16.3 — Mortality & Morbidity Reporting
**Flow Refs:** Flow P3 (USER_FLOWS.md §P3)

## Description

Build the **Mortality/Morbidity Report Page** from Flow P3. View system-computed Top 10 lists from finalized ICD-10 codes, drill down per condition, and export to PDF.

## Pages to Build

| Page | Route |
|------|-------|
| Mortality/Morbidity Report Page | `/surveillance/mortality-morbidity` |
| Condition Drilldown Page | `/surveillance/mortality-morbidity/[icdCode]` |

## Functional Requirements (per Flow P3)

- Report Page tabs: `Mortality` and `Morbidity`. Each tab shows the Top 10 list with ranks and counts.
- Filters: reporting period (default current quarter), ward, sex, age band.
- Drilldown Page: per-condition counts, demographic breakdown (sex, age band), trend chart over the chosen period.
- Export PDF for DOH submission.

## Acceptance Criteria

- [ ] Top 10 ranks change based on filters and the rank movement is visible (up / down arrows vs prior period).
- [ ] Demographic breakdown charts include age bands `<1, 1-4, 5-14, 15-24, 25-44, 45-64, 65+`.
- [ ] Drilldown links each row to the underlying encounters (read-only) for verification.
- [ ] PDF includes the facility header, period, generation timestamp, and signature line.
- [ ] Empty / loading / error states; URL-synced filters.

## Dependencies

- SUR-FE-01, ADM-FE-02.
- SUR-BE-04 (mortality / morbidity service) for live wiring.

## References

- USER_FLOWS.md §P3.
- USER_STORIES.md §16 Story 16.3.
- TOR §3 — Top 10 leading causes mapped to finalized ICD-10 codes.
