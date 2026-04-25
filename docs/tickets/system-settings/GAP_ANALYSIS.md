# System Settings Gap Analysis

Status: Resolved
Scope: Admin-role configuration at `/admin/settings`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`

## Summary

Fresh repo-backed review on 2026-04-25 finds one remaining material gap in the current `/admin/settings` implementation.

What is now aligned:

- the sidebar, page, and backend all require the dedicated `system_settings` permission in addition to admin access;
- privileged settings updates capture request provenance in the audit log;
- the update path rejects or overrides attempts to disable mandatory break-glass, DPA-export, offline-cache, and discharge-freeze controls;
- the default and read paths now normalize TOR-mandatory offline settings so newly provisioned and legacy rows do not remain non-compliant.

What remains misaligned:

1. the read path now mutates compliance-critical settings without producing a corresponding audit event.

## Remaining Material Gap

### 1. Silent read-path normalization bypasses the required audit trail

- `apps/backend/src/modules/v1/system-settings/system-settings.service.ts` now corrects legacy false values inside `get()` and returns the normalized row.
- that same method explicitly treats the correction as a no-audit operation.
- this means a facility's persisted system settings can change as a side effect of loading `/admin/settings` without an audit record for the change.

Result:

- a compliance-critical configuration mutation can occur with no event for auditors or privacy officers to inspect;
- the system's persisted state can differ from the last auditable settings change;
- the surface is functionally corrected, but the audit chain is incomplete.

TOR basis:

- Section 1 gives the Auditor/Privacy Officer access to detailed audit logs of system activity.
- Section 4.2 requires comprehensive audit trails as part of privacy and security compliance.

## Non-Issues Confirmed In This Review

- The prior offline default/read-path ticket is resolved in code and should stay closed.
- The settings page's minimal "Recent changes" card is not being treated as a new compliance gap because the repo already has a separate audit/config-history surface and contracts for detailed configuration history.

## Conclusion

No additional material `/admin/settings` gaps were found for admin-role TOR alignment beyond this missing audit event for automatic normalization.

Once SS-001 is fixed, this surface should be considered TOR-aligned unless a future audit finds a new regression.