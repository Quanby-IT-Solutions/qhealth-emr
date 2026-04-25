# RBAC Gap Analysis

Date: 2026-04-25
Source of truth: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Scope reviewed: backend permission decorators and guard behavior, frontend App Router action visibility, navigation gating, and seeded role bundles.

## Result

ZERO GAPS FOUND - RBAC FULLY COMPLIANT.

## Closed Tickets

1. `RBAC-001` - Closed. HIM dashboard routing, navigation, and backend handlers now align on `medical_records:view` for HIM workflows rather than splitting access across contradictory admin-only and HIM-facing boundaries.
2. `RBAC-002` - Closed. Surgical authoring roles now carry the required `surgical:create` capability in seed data and live-role alignment, matching the TOR-authorized operating-room authorship workflow.
3. `RBAC-003` - Closed. Surgical encounter write controls are now hidden or disabled for view-only roles, so the frontend no longer advertises mutations the backend would reject.

## Verified Follow-up Checks

- `/him`, `/admin/him-ops`, and `/radiology` now enforce the intended read boundaries.
- Telemedicine navigation now keys off `telemedicine:view`.
- Notification access now includes `notifications:view` across seeded staff bundles, including Billing Officer.
- The notification SSE stream now carries `@RequirePermission("notifications", "view")`.
- Previously unguarded admin pages reviewed in this audit now apply explicit page-level permission checks.

## Notes

- This audit intentionally excluded speculative issues and focused only on concrete code paths that widened access beyond the TOR's least-privilege model.
- The reviewed RBAC surface is materially aligned for the current TOR scope. Subsequent admin-page reviews should now proceed as page-specific workspace audits rather than reopening the closed RBAC ticket set unless a new cross-cutting permission defect appears.