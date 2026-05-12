# [SUR-FE-03] Surveillance — AHSR Dashboard, Validation & Export Pages

**Role:** Surveillance
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 16.2 — AHSR Data Aggregation
**Flow Refs:** Flow P2 (USER_FLOWS.md §P2)

## Description

Build the **AHSR Dashboard**, **AHSR Validation Page**, and **AHSR Export Page** from Flow P2. Aggregate metrics (BOR, Death Rates, Top 10 Mort/Morb, HAI), resolve data quality flags, and export the DOH-format file.

## Pages to Build

| Page | Route |
|------|-------|
| AHSR Dashboard | `/surveillance/ahsr` |
| AHSR Validation Page | `/surveillance/ahsr/validate` |
| AHSR Export Page | `/surveillance/ahsr/export` |

## Functional Requirements (per Flow P2)

- Dashboard tiles: BOR, Gross Death Rate, Net Death Rate, Top 10 Mort, Top 10 Morb, HAI Incidence (per 1000 pt-days), AHSR Readiness % (composite).
- Validation Page: list of data-quality issues (missing ICD-10, deprecated codes, encounters without finalized notes), each with a CTA `Open in HIM` to drill in.
- Export Page: select reporting period (quarter/year), preview DOH-format payload, download CTA.
- All metrics source from ADM-BE-06 (BOR), HIM-BE-03 (ICD-10), HIM-BE-05 (HAI).

## Acceptance Criteria

- [ ] Dashboard refreshes every 5 minutes or on demand; the `Readiness %` tile shows a tooltip with what's missing.
- [ ] Validation Page groups issues by type with counts; clicking a group shows the affected encounters.
- [ ] Export Page disables the download until the readiness threshold (configurable, default 95%) is reached or an admin override is recorded.
- [ ] The exported file matches the DOH AHSR template (column headers documented in the test fixture).
- [ ] Loading / empty / error states.
- [ ] Period selector supports the same date precision the DOH expects (quarterly, annual).

## Dependencies

- SUR-FE-01, ADM-FE-02.
- SUR-BE-03 (AHSR aggregation service) for live wiring.
- ADM-BE-06, HIM-BE-03, HIM-BE-05 as data sources.

## References

- USER_FLOWS.md §P2.
- USER_STORIES.md §16 Story 16.2.
- TOR §3 — AHSR metrics list.
