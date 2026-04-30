# Admin Workspace Tickets

Status: Open
Scope: Administrator workspace at `/admin`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Last Reviewed: 2026-04-29

## Current Verdict

Fresh source-backed re-audit of the Administrator role found two remaining TOR alignment gaps.

What is already aligned:

- users, roles, feature flags, system settings, facility profile, integration registry, formulary read-only access, FHIR export oversight, and SLA monitoring remain valid admin-owned governance surfaces;
- non-admin operational routes under `/admin` are no longer reachable by Administrator alone;
- the Administrator seed still has no direct clinical write permissions;
- configuration history and offline operations already exist as admin-gated pages.

## Ticket Index

- `ADMIN-001` — surface configuration history in the admin overview
- `ADMIN-002` — surface offline operations in the admin overview

## Conclusion

`/admin` is close to the TOR boundary, but it is not fully aligned yet.

The remaining drift is now a discoverability problem on the admin landing page. Two admin-owned governance functions already exist in the `/admin` namespace but are not surfaced from the overview, leaving the System Admin workspace incomplete against the TOR's configuration and continuity-management expectations.