# ADM-03: Create Admin Dashboard Data Contract And Aggregation Service

## Summary

Introduce a typed admin dashboard summary endpoint that aggregates the KPIs, alerts, and recent changes needed for the Administrator dashboard.

## Problem

The current dashboard widget layer has no real admin data model. The admin dashboard needs a single summary source for governance, configuration, audit, integration, and ARTA visibility.

## Source References

- `apps/web/app/(site)/dashboard/page.tsx`
- `apps/web/features/app-shell/components/dashboard-widgets.tsx`
- `packages/contracts/src/modules/v1`
- `apps/backend/src/modules/v1`

## Scope

- add contract schema and endpoint for admin dashboard summary
- add backend controller/service method for admin dashboard aggregation
- aggregate counts and risk summaries across:
  - user lifecycle
  - role and permission governance
  - feature flags
  - system settings and facility profile completeness
  - integration registry health
  - audit and break-glass events
  - ARTA/SLA status
- keep endpoint read-only and suitable for dashboard load

## Out of Scope

- page-level detail UIs for each feature area
- realtime streaming or websockets

## Acceptance Criteria

- new typed contract exists for the admin dashboard summary
- new backend endpoint returns a dashboard summary object for Administrator use
- endpoint is protected by appropriate admin/audit permissions
- response includes at minimum:
  - summary cards
  - alert list
  - quick actions metadata or links
  - recent changes
  - compliance and ARTA/SLA summaries
  - integration health summary
- response is compatible with seeded data and empty-state scenarios

## Suggested Response Areas

- `summaryCards`
- `alerts`
- `recentChanges`
- `quickActions`
- `accessGovernance`
- `platformControl`
- `integrations`
- `audit`
- `artaSla`

## Implementation Notes

- place contracts under `packages/contracts/src/modules/v1/admin-dashboard/` only if consistent with repo patterns; otherwise colocate with an existing admin-related feature module
- prefer aggregation queries over many fine-grained client requests
- include empty-state-safe defaults in response

## Validation

- contract tests
- backend controller/service tests
- manual inspection with seeded data
- typecheck for contracts, backend, and web consumption

## Dependencies

- ADM-01 for correct admin semantics
- ADM-02 for correct role-to-dashboard routing in UI

## Risks

- some ARTA/SLA metrics may depend on missing event instrumentation
- aggregation breadth can introduce performance issues if query design is poor

## Definition of Done

- a typed admin dashboard summary endpoint exists and is consumable by the web app