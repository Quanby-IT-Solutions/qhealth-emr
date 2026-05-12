# [ADM-FE-06] Admin — Bed Occupancy Rate (BOR) & Census Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 2.5 — Bed Occupancy Rate Computation (USER_STORIES.md §2)
**Flow Refs:** Flow B5 — BOR Computation Review (USER_FLOWS.md §B5)

## Description

Build the **BOR Dashboard** with a gauge and trend chart, the **Census Report Page** with daily tabular census, and the **Export Modal** for AHSR submission. The DOH midnight census formula (TOR §2.1) is computed server-side; this ticket renders the visualization and export UI.

## Pages to Build

| Page | Route |
|------|-------|
| BOR Dashboard | `/admin/bor` |
| Census Report Page | `/admin/bor/census` |
| Export Modal | overlay |

## Functional Requirements (per Flow B5)

- BOR Dashboard hero: large gauge (current %), trend chart (7d / 30d / 90d / 1y), filter by Ward, Date Range.
- KPI tiles using `KpiTile`: Today's BOR, 7-day Average, Available Beds, Occupied, Reserved, Dirty/For-Cleaning. (Bed status taxonomy from Flow B7.)
- Census Report Page: daily table (date, midnight census, admissions, discharges, deaths ≤48h, deaths >48h) — death columns feed Gross/Net Death Rate per Story 2.6 / TOR §2.1.
- Export Modal: format select (PDF for AHSR, CSV for analysis), date range, ward scope, optional comments. CTA `Generate`.

## Acceptance Criteria

- [ ] Gauge color band: green ≤85%, amber 85–95%, red >95%.
- [ ] Trend chart x-axis adapts to the chosen range and uses the design system's chart palette.
- [ ] Census table is sortable by every column and supports column visibility toggling.
- [ ] Filter state is URL-synced so the page is shareable.
- [ ] Export Modal disables `Generate` until a valid range is chosen; closes after the download is triggered.
- [ ] Page handles the `no data for selected range` state with a clear empty-state illustration.
- [ ] Death-rate columns are clearly labeled `Gross (≤48h)` and `Net (>48h)` per the DOH AHSR formula.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-06 (BOR computation service) for live data.

## References

- USER_FLOWS.md §B5.
- USER_STORIES.md §2 Story 2.5 and §2 Story 2.6 (death-rate definition).
- TOR §2.1 — DOH-mandated midnight census formula and Gross/Net Death Rate computation.
- TOR §3 — AHSR.
