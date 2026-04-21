# ADM-09: Add Admin Dashboard Quick Actions And Task Shortcuts

## Summary

Add an Administrator quick-action rail for the highest-frequency governance tasks.

## Problem

Even with live widgets, the admin dashboard remains inefficient if the user cannot quickly reach the most common tasks.

## Source References

- `apps/web/app/(site)/dashboard/page.tsx`
- `apps/web/features/app-shell/components/dashboard-widgets.tsx`
- `apps/web/features/app-shell/lib/navigation.ts`

## Scope

- add quick actions for:
  - Create User
  - Review Inactive Users
  - Open Roles & Permissions
  - Open Feature Flags
  - Open System Settings
  - Open Facility Profile
  - Open Integration Registry
  - View Audit Trail
  - View SLA Dashboard
- ensure permission gating is respected

## Out of Scope

- bulk admin operations
- workflow wizards

## Acceptance Criteria

- quick actions are visible above the fold on desktop
- navigation actions use links, not click handlers on non-semantic elements
- permission-gated actions do not render when unavailable
- focus states and keyboard access comply with UI guidelines

## Implementation Notes

- keep labels explicit and action-oriented
- preserve a compact layout on smaller screens

## Validation

- verify all quick action links route correctly
- verify unauthorized actions are hidden
- test keyboard-only interaction

## Dependencies

- ADM-02 recommended
- can be implemented before ADM-03 if using static route metadata, but final version should align with live dashboard data

## Risks

- overloading the top of the dashboard can reduce scanability; prioritize the highest-frequency actions only

## Definition of Done

- Administrator can reach the most common governance tasks from `/dashboard` in one click