# Epic: Admin Dashboard TOR Alignment

## Goal

Deliver a production-ready Administrator dashboard aligned with the TOR-defined System Admin role:

- manages configuration, users, roles, and feature flags
- oversees interoperability, compliance, privacy, and audit visibility
- monitors ARTA/Citizen's Charter turnaround metrics and SLA health
- has no clinical write access

## Source References

- TOR role definition: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- Current dashboard route: `apps/web/app/(site)/dashboard/page.tsx`
- Current dashboard widget renderer: `apps/web/features/app-shell/components/dashboard-widgets.tsx`
- Current dashboard widget mapping: `apps/web/features/app-shell/lib/navigation.ts`
- Current seeded Administrator permissions: `packages/db/src/seed-dev.ts`

## Problem Summary

The current Administrator experience is incomplete in four ways:

1. The System Admin role in seed data currently has clinical write permissions, which violates the TOR.
2. The dashboard widget registry is keyed to `system admin`, while the seeded role is `Administrator`, so the role likely falls back to a generic widget set.
3. The `/dashboard` page uses placeholder widgets with no live operational data.
4. The dashboard does not yet surface admin-critical governance, privacy, integration, and ARTA monitoring signals required by the TOR.

## Epic Scope

- align Administrator permissions with TOR
- fix role-to-dashboard mapping
- introduce an admin dashboard summary contract and backend aggregation endpoint
- build live admin dashboard widgets for governance and risk visibility
- add quick actions for the most common administrator tasks
- add seed data and test coverage for the new dashboard experience

## Out of Scope

- full redesign of non-admin dashboards
- enterprise BI/reporting outside dashboard summary needs
- non-admin RBAC redesign beyond what is necessary to correct Administrator behavior

## Done When

- Administrator no longer has clinical write permissions
- Administrator sees an admin-specific dashboard on `/dashboard`
- dashboard widgets render live data rather than placeholders
- dashboard includes quick actions and compliance/operational visibility
- contracts, backend aggregation, web UI, seed data, and tests are in place

## Recommended Delivery Order

1. ADM-01 - Align Administrator Permission Model With TOR
2. ADM-02 - Fix Administrator Dashboard Role Mapping And Dashboard Registry
3. ADM-03 - Create Admin Dashboard Data Contract And Aggregation Service
4. ADM-04 - Build Access Governance Dashboard Widgets
5. ADM-05 - Build Platform Control Dashboard Widgets
6. ADM-06 - Build Integration And Interoperability Dashboard Widgets
7. ADM-07 - Build Privacy, Audit, And Break-Glass Dashboard Widgets
8. ADM-08 - Build ARTA And SLA Turnaround Monitoring Widgets
9. ADM-09 - Add Admin Dashboard Quick Actions And Task Shortcuts
10. ADM-10 - Admin Dashboard QA, Seeds, And Test Coverage

## Dependencies Summary

- ADM-01 should land before final sign-off because the role itself is currently off-TOR.
- ADM-02 should land before dashboard UI validation, otherwise the wrong widget set may render.
- ADM-03 is the main backend foundation for ADM-04 through ADM-08.
- ADM-08 may depend on workflow timestamp instrumentation if ARTA timing data is incomplete.
- ADM-10 closes the loop and should land with or immediately after the feature tickets.

## Suggested Phase 1

If this needs to ship incrementally, Phase 1 should include:

- ADM-01
- ADM-02
- ADM-03
- ADM-04
- ADM-05
- ADM-09

That delivers a corrected Administrator role and a dashboard with immediate operational value.