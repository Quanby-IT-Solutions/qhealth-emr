# System Settings Gap Analysis

Status: Closed
Scope: Admin-role configuration at `/admin/settings`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Last Reviewed: 2026-04-26

## Summary

Fresh audit of the current implementation finds no remaining material TOR gaps affecting the admin settings surface.

## What Is Aligned

- The page requires dedicated `admin:view` and `system_settings:view` permissions.
- Edit capability is separated from read capability and requires `system_settings:edit` in the backend controller.
- Mandatory TOR guardrails remain locked on in the UI.
- The contract rejects attempts to disable TOR-mandatory controls.
- The backend update path re-enforces the same mandatory controls for defense in depth.
- Settings audit visibility is aligned again across the writer and the governance readers.
- Offline continuity is evidenced in a clinician-facing patient search flow that reads cached patient summaries while offline and returns to live data on reconnect.
- The page scope remains administrative and does not grant the System Admin clinical write behavior, matching the TOR role boundary.

## Remaining Material Gaps

None.

## Non-Issues Confirmed In This Review

- No permission-boundary gap was found in the `/admin/settings` page or controller.
- No TOR gap was found around the mandatory break-glass, DPA export consent, discharge charge freeze, or offline-required controls being disabled from the admin settings UI.
- No TOR gap was found in the system settings audit-history readers after the entity-type normalization fix.
- No new material System Admin role-boundary issue was found in this slice.

## Non-Blocking Notes

- The in-page “Recent changes” card still shows only a last-updated timestamp, while detailed provenance lives on the separate config history surface. That is a discoverability issue, not a material TOR blocker for `/admin/settings`.
- This re-audit was source-backed. It did not include a browser-authenticated end-to-end walk through the protected page.

## Conclusion

The admin settings surface is currently TOR-aligned for the reviewed admin-role scope. No new system-settings tickets are required from this re-audit.