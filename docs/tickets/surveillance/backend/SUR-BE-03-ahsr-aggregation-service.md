# [SUR-BE-03] AHSR Aggregation & Validation Service

**Role:** Surveillance
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 16.2 — AHSR Data Aggregation
**Flow Refs:** Flow P2

## Description

Aggregate the DOH AHSR metrics (BOR, Gross/Net Death Rate, Top 10 Mort/Morb, HAI), validate data quality, and produce the DOH-format export file.

## Endpoints (oRPC)

- `surveillance.ahsr.dashboard` — current metrics + readiness %.
- `surveillance.ahsr.validate` — list data-quality issues for the period.
- `surveillance.ahsr.export` — generate DOH-format file (XML + CSV bundle).
- `surveillance.ahsr.lockPeriod` — admin-only; finalizes the period.

## Functional Requirements

- Sources: BOR / Death Rate from ADM-BE-06; Top 10 Mort/Morb from SUR-BE-04; HAI from HIM-BE-05.
- Validation issue types: missing ICD-10 (encounters discharged but uncoded), deprecated codes used, encounters without finalized notes.
- Readiness % is `(encounters meeting all data quality gates) / (total encounters in period) × 100`.
- Export bundle is generated server-side and stored via the object storage facade.

## Acceptance Criteria

- [ ] Dashboard responds in <500ms for a quarterly period via materialized aggregates refreshed every 15 minutes.
- [ ] Validation issue list is paginated and links each issue to the source encounter.
- [ ] Export rejects below readiness threshold unless `adminOverride=true` with a reason.
- [ ] Lock Period freezes the period — subsequent edits to underlying data do not change the snapshot.
- [ ] Endpoints require `surveillance.ahsr.read|write` permissions.
- [ ] Integration tests cover dashboard, validate, export, lock.

## Dependencies

- SUR-BE-01, ADM-BE-06, HIM-BE-03, HIM-BE-05.

## References

- USER_FLOWS.md §P2.
- USER_STORIES.md §16 Story 16.2.
- TOR §3 — AHSR.
