# Facility Profile Admin Audit

Status: Clear
Last Reviewed: 2026-04-27
Scope: Administrator access to `/admin/facility-profile`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Supporting References: `docs/USER_STORIES.md` Story 20.1, `docs/USER_FLOWS.md` T1

## Summary

The current administrator facility-profile workspace is materially aligned with the TOR expectation that the Administrator configures the facility identity used across reports, exports, and external submissions.

## Active Tickets

None. The latest browser-authenticated and source-backed review did not find any new material TOR-compliance gaps for `/admin/facility-profile`.

## Notes

- The page is protected by `facility_profile:view`, while edit capability is separated behind `facility_profile:edit`.
- Canonical identity fields are persisted through the `facilities` table, while auxiliary administrative fields are persisted through `facility_profiles`.
- The backend writes atomic audit entries for profile updates and the page links to full history.
- The page still shows a brief permission-denied placeholder while the RBAC profile query is loading. That is a UX flicker, not a material admin-role compliance gap.