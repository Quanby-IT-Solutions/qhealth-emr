# Facility Profile Gap Analysis

Status: Closed
Scope: Admin-role facility governance at `/admin/facility-profile`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Supporting References: `docs/USER_STORIES.md` Story 20.1, `docs/USER_FLOWS.md` T1
Last Reviewed: 2026-04-27

## Summary

Fresh browser-authenticated and source-backed verification finds no remaining material gaps that prevent the Administrator role from using `/admin/facility-profile` as the authoritative facility identity workspace required by the current TOR story and flow set.

## What Is Aligned

- The page is accessible to the Administrator role and loads the current facility identity values end to end.
- Read access is protected by `facility_profile:view` and write access is protected by `facility_profile:edit` in the backend controller.
- The UI separates read and edit behavior correctly by disabling inputs for non-edit users.
- The page covers the expected facility-identity fields for this slice: facility name, type, DOH license number, PhilHealth accreditation ID, facility code, governing authority, address, contact details, and administrative contact details.
- Canonical identity fields are written to `facilities`, keeping downstream reporting identity authoritative instead of duplicating it in a page-local table.
- Auxiliary operational fields are written to `facility_profiles`, preserving the intended split between canonical and administrative metadata.
- Update operations write an audited before-and-after record atomically.
- The recent-changes card links to full audit history for the facility-profile entity.
- Browser verification confirmed that unsaved-change detection, discard behavior, and editable controls all work for the Administrator role.

## Remaining Material Gaps

None.

## Non-Issues Confirmed In This Review

- No admin-role access gap was found for the protected page once the RBAC query settles.
- No material persistence gap was found between the web form, the contract, and the backend update path.
- No missing admin-role edit capability was found in the verified runtime flow.

## Non-Blocking Notes

- The route currently renders a brief permission-denied placeholder while `useMyProfile()` is still loading. That causes a transient false-negative flash in snapshots, but it resolves correctly once the RBAC query returns.
- The in-page recent-changes card still exposes only a last-updated summary plus a history link, rather than embedding recent actor-level entries directly in the page. That is a discoverability issue, not a material TOR blocker for this surface.

## Conclusion

The facility-profile surface is currently TOR-aligned for the reviewed admin-role scope. No new facility-profile tickets are required from this audit.