# [HIM-FE-02] HIM — Chart Deficiency Worklist Pages

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 15.1 — Chart Deficiency Tracking
**Flow Refs:** Flow O1 (USER_FLOWS.md §O1)

## Description

Build the **Deficiency Worklist** and **Deficiency Detail Page** from Flow O1. Track and resolve chart deficiencies after discharge (missing signature, undocumented procedure, missing discharge summary).

## Pages to Build

| Page | Route |
|------|-------|
| Deficiency Worklist | `/him/deficiencies` |
| Deficiency Detail Page | `/him/deficiencies/[deficiencyId]` |

## Functional Requirements (per Flow O1)

- Worklist columns: Patient, Encounter, Discharge Date, Deficiency Type, Owner (Physician), Age (days since discharge), Status.
- Filters: Deficiency Type, Owner, Age bucket (<7d, 7–14d, 14–30d, >30d), Status.
- Detail Page: full deficiency description, link to chart, history of notifications, CTA `Notify Owner` (sends in-app + email), CTA `Mark Resolved` (requires confirmation that the underlying issue is fixed).
- Aging chart on the worklist page: bar chart by age bucket.

## Acceptance Criteria

- [ ] Worklist supports server-side pagination, sorting, and the filters above.
- [ ] Aging buckets use destructive color for >30 days.
- [ ] Notify Owner CTA logs every notification with timestamp and channel.
- [ ] Mark Resolved triggers a confirmation dialog and is disabled until the linked chart artifact (signature / note) is detected as present (server check).
- [ ] Empty / loading / error states.
- [ ] URL-synced filter state.
- [ ] Encounter Context Bar visible on Detail Page.

## Dependencies

- HIM-FE-01, ADM-FE-02.
- HIM-BE-02 (deficiency service) for live wiring.

## References

- USER_FLOWS.md §O1.
- USER_STORIES.md §15 Story 15.1.
- TOR §1 — HIM Coder: manages chart deficiencies.
