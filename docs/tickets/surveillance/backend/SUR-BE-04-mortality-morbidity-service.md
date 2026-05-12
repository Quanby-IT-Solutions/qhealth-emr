# [SUR-BE-04] Mortality & Morbidity Reporting Service

**Role:** Surveillance
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 16.3 — Mortality & Morbidity Reporting
**Flow Refs:** Flow P3

## Description

Compute Top 10 Mortality and Morbidity rankings from finalized ICD-10 codes; per-condition demographic breakdowns; PDF export.

## Endpoints (oRPC)

- `surveillance.mm.top10` — params: type (mort / morb), period, ward?, sex?, ageBand?.
- `surveillance.mm.condition` — params: icdCode, period; returns counts and demographic breakdown.
- `surveillance.mm.exportPdf` — params: period; returns signed URL.

## Functional Requirements

- Counts source from `encounter_codes` (HIM-BE-03) where `signed_at IS NOT NULL` only — unsigned codes are excluded.
- Mortality counts include only encounters with disposition `Expired`.
- Demographics use age bands `<1, 1-4, 5-14, 15-24, 25-44, 45-64, 65+`.
- Top-10 ties broken alphabetically by ICD-10 code with ties shared rank.

## Acceptance Criteria

- [ ] Top-10 endpoint deterministic: same input → same output.
- [ ] Tie-breaking documented in the service docstring and unit-tested.
- [ ] Period boundary is inclusive at start, exclusive at end (`[start, end)`).
- [ ] PDF includes facility header, generation timestamp, signature line.
- [ ] Endpoints require `surveillance.mm.read` permission.
- [ ] Unit tests cover empty period, single dominant condition, tie-break.

## Dependencies

- SUR-BE-01, HIM-BE-03.

## References

- USER_FLOWS.md §P3.
- USER_STORIES.md §16 Story 16.3.
- TOR §3 — Top 10 leading causes from finalized ICD-10 codes.
