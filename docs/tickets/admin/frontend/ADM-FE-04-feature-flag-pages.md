# [ADM-FE-04] Admin — Feature Flag & Module Configuration Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 1.3 — Feature Flag and Module Configuration (USER_STORIES.md §1)
**Flow Refs:** Flow A3 — Configure Feature Flags & Modules (USER_FLOWS.md §A3)

## Description

Build the **Feature Flag Dashboard**, **Module Configuration Page**, and **Save Confirmation Modal** from Flow A3. Allow toggling each EMR module (TOR §2 — fourteen modules) on/off per facility and per environment (Staging / Production).

## Pages to Build

| Page | Route |
|------|-------|
| Feature Flag Dashboard | `/admin/feature-flags` |
| Module Configuration Page | `/admin/feature-flags/[moduleId]` |
| Save Confirmation Modal | overlay |

## Functional Requirements (per Flow A3)

- Dashboard groups toggles by module category from TOR §2.
- Each row shows: module name, toggle state, environment scope chip (Staging / Production), last-changed timestamp, last-changed-by user.
- Module Configuration Page lets the admin set per-module dependencies and sub-settings (e.g., enable Telemedicine with required PRC validation, disable Blood Bank for Level-1 facility per Flow A3 example).
- Save Confirmation Modal summarizes the diff (what flags will change) before commit.
- Optimistic UI is **not** used — toggles update only after server confirmation (this is a high-impact configuration screen).

## Acceptance Criteria

- [ ] Dashboard lists every module from TOR §2 grouped by category (Clinical, Financial, Reporting, Interop).
- [ ] Each toggle row uses `ToggleListItem` from ADM-FE-02 with three states: Off, Staging-only, Production.
- [ ] Module Configuration Page renders module-specific settings forms (placeholder for ADM-BE-04 wiring).
- [ ] Save Confirmation Modal lists the explicit before/after for each changed flag with role-affected count badge.
- [ ] Audit-trail hint banner (`Changes are logged to the audit trail`) is shown on the dashboard.
- [ ] Page is responsive: dashboard is usable on a 1024px viewport (admin tablet kiosk scenario).

## Dependencies

- ADM-FE-01, ADM-FE-02.

## References

- USER_FLOWS.md §A3.
- USER_STORIES.md §1 Story 1.3.
- TOR §2 — Module list to render in the toggle dashboard.
