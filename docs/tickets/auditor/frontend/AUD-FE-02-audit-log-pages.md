# [AUD-FE-02] Auditor — Audit Log Dashboard & Detail Pages

**Role:** Auditor
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review
**Flow Refs:** Flow A6 (USER_FLOWS.md §A6)

## Description

Build the **Audit Log Dashboard**, **Audit Detail Page**, and **Export Modal** from Flow A6. Filter by Date Range, User, Action Type, Severity; view a timeline of events; review before/after diffs; export CSV / PDF.

## Pages to Build

| Page | Route |
|------|-------|
| Audit Log Dashboard | `/auditor/audit-log` |
| Audit Detail Page | `/auditor/audit-log/[eventId]` |
| Export Modal | overlay |

## Functional Requirements (per Flow A6)

- Dashboard columns: Timestamp, User, Role, Action Type (Read / Write / Break-Glass / Login), Resource, Severity (Info / Warning / Critical), IP, Outcome.
- Color-coding for severity using semantic tokens.
- Filters: Date Range, User, Action Type, Severity, Resource Type, Outcome (success / fail).
- Detail Page: timeline of related events for the same session, before/after diff for write actions, raw JSON payload toggle, IP geolocation snippet.
- Export Modal: format select (CSV for raw data, PDF for compliance file), date range, filter snapshot. CTA `Generate`.

## Acceptance Criteria

- [ ] Dashboard supports server-side pagination, virtualized rendering for >1000 rows in the current page.
- [ ] Filters are URL-synced.
- [ ] Detail Page diff view highlights changed fields with green/red and shows surrounding context.
- [ ] Raw JSON toggle is keyboard-accessible and copies to clipboard.
- [ ] Export Modal records every export with a hash so the exported artifact is provably authentic.
- [ ] Empty / loading / error states.
- [ ] Page is read-only — no write CTAs anywhere.

## Dependencies

- AUD-FE-01, ADM-FE-02.
- AUD-BE-02 (audit log query API) for live wiring.

## References

- USER_FLOWS.md §A6.
- USER_STORIES.md §1 Story 1.6.
- TOR §4.2 — DPA, comprehensive audit trails.
