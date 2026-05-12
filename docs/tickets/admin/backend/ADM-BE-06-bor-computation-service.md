# [ADM-BE-06] BOR Computation & Census Service

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 2.5 — BOR Computation; Story 2.6 (death rate inputs)
**Flow Refs:** Flow B5

## Description

Compute Bed Occupancy Rate using the DOH-mandated midnight census formula, accounting for same-day admit/discharge (TOR §2.1). Compute Gross / Net Death Rates from `encounters.discharged_at - admitted_at` against the 48-hour boundary.

## Endpoints (oRPC)

- `admin.bor.current` — today's BOR + KPI tiles.
- `admin.bor.trend` — series for 7d / 30d / 90d / 1y.
- `admin.bor.census` — daily census table.
- `admin.bor.export` — generates AHSR-format report.

## Computation Rules

- **Midnight Census:** at 00:00 daily, snapshot occupied beds; same-day admit-and-discharge counts as 1 inpatient day per DOH.
- **BOR:** `inpatient_days_in_period / (available_beds × days_in_period)`.
- **Gross Death Rate:** deaths within ≤48h of admission ÷ total discharges (per Story 2.6 wording).
- **Net Death Rate:** deaths after >48h of admission ÷ total discharges (per Story 2.6 wording).

## Acceptance Criteria

- [ ] A scheduled job runs at 00:05 daily and writes to `bed_census_daily`.
- [ ] `admin.bor.current` returns today's value computed from live data, not the prior snapshot, when the request arrives mid-day.
- [ ] Death rate computation explicitly partitions on the 48-hour boundary and is unit-tested with edge cases at exactly 48h00m, 47h59m, and 48h01m.
- [ ] Export endpoint produces a PDF and CSV; the CSV column headers match the DOH AHSR template (column names documented in the test fixture).
- [ ] Endpoints require `admin.bor.read` permission.
- [ ] All computations are pure functions in `apps/backend/src/modules/v1/admin/bor/bor.service.ts` with deterministic unit tests.

## Dependencies

- ADM-BE-01, ADM-BE-02.
- Bed-status data from Flow B7 (out of scope for this ticket; mock seeded data acceptable).

## References

- USER_FLOWS.md §B5, §B7.
- USER_STORIES.md §2 Stories 2.5, 2.6.
- TOR §2.1, §3 — DOH AHSR mandates.
