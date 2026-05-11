# [REG-FE-05] Bed Status Page

**Role:** Registrar
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 2.9
**Flow Refs:** Flow B7 step 8

## Description

Build the Bed Status Page that lists all beds with current status and reveals a per-bed transition timeline. Used by Registrar to monitor turnover and by Auditor for ARTA Flow 5 verification.

## Page Route

`/registrar/beds` — server component prefetches bed list; client component handles filters and timeline drawer.

## Page Layout

- Filter bar: Ward selector · Status multi-select (`available`, `occupied`, `reserved`, `cleaning`, `dirty_for_cleaning`, `out_of_service`) · free-text search by bed label.
- Bed list table: Bed label · Ward · Status badge · Current encounter (if any) · Last status change time · `View timeline` button.
- Clicking `View timeline` opens a side drawer rendering `<BedStatusTimeline />` (REG-FE-02) sourced from `GET /api/v1/beds/:id/status-history`.

## Functional Requirements

- Reuse existing bed components from `apps/web/features/beds/` where possible (read-only list rendering, status badges).
- Filters persist in URL search params.
- Realtime: subscribe to `bed.dirtied` and `bed.status_changed` notification topics to update the visible row without a manual refresh.
- Paginated: 50 beds per page by default.

## Acceptance Criteria

- [ ] All bed statuses (including the new `dirty_for_cleaning`) render with distinct, accessible badges.
- [ ] Timeline drawer shows ordered transitions with `at`, `from`, `to`, `changedBy`.
- [ ] Filter changes update the URL and the list responds within 300ms.
- [ ] Realtime update on bed-dirtied event happens without page reload.
- [ ] Empty state ("No beds match filters") renders cleanly.
- [ ] Accessibility: table has proper roles, badges include text labels.

## Dependencies

- REG-FE-01, REG-FE-02
- REG-BE-05 (`status-history` endpoint)
- REG-FE-07 (hooks)

## References

- USER_FLOWS.md §B7 step 8
- USER_STORIES.md §2.9
- Existing: `apps/web/features/beds/`
