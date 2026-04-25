# SLA Gap Analysis

Status: Closed
Scope: Admin-role SLA governance for `/admin/sla`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`, Section 1 (System Admin) and Section 6 (ARTA / Citizen's Charter workflows)

## Summary

Fresh repo-backed verification on 2026-04-24 finds no remaining material gaps that prevent the System Admin role from using `/admin/sla` as the authoritative ARTA / Citizen's Charter oversight surface required by the TOR.

Confirmed in current source:

- `/sla` redirects admin users into `/admin/sla`.
- `/admin/sla` remains the unified admin workspace for configuration, active monitoring, and compliance reporting.
- SLA events, configs, step-configs, and compliance-report backend endpoints remain protected by explicit `admin` permissions.
- Flow coverage for Section 6 remains represented across Flows 1 to 7, including Flow 7 certificate issuance steps and timing models.
- The previously open death-reporting gaps are now closed: FMDRF is draft-first on creation, death-report evidence mutations are explicitly RBAC-protected, and admin certificate summary counts now exclude completed birth/death rows from open-work totals.

## Remaining Material Gaps

None confirmed for admin-role TOR alignment.

## Non-Blocking Observation Outside Admin Scope

There is still a separate route-surface inconsistency for non-admin reporting users:

- the frontend `/sla` and reporting-facing SLA entrypoints still admit `reporting:view` users,
- while the underlying SLA events and compliance-report backend endpoints require `admin:view`.

This does not block System Admin compliance for `/admin/sla`, so no admin-scope ticket is opened from this audit.

## Conclusion

No new admin-role SLA tickets are required from this audit.