# ADM-05: Build Platform Control Dashboard Widgets

## Summary

Implement dashboard widgets for feature flags, system settings, and facility profile status.

## Problem

The TOR assigns feature flags and configuration ownership to System Admin, but the dashboard does not currently surface their health, risk, or completeness.

## Source References

- `apps/web/features/admin/components/feature-flags-panel.tsx`
- `apps/web/features/admin/components/admin-settings-panel.tsx`
- `apps/web/app/(site)/admin/facility-profile/page.tsx`

## Scope

- add widgets for:
  - enabled high-risk feature flags
  - recently changed feature flags
  - missing or stale critical system settings
  - facility profile completeness
  - last config/profile update
- add links into:
  - `/admin/feature-flags`
  - `/admin/settings`
  - `/admin/facility-profile`

## Out of Scope

- redesigning existing feature flag or settings pages
- implementing approval workflows

## Acceptance Criteria

- dashboard exposes feature flag risk posture
- dashboard indicates whether facility profile is complete enough for reports/exports/submissions
- dashboard surfaces missing critical settings and stale updates
- quick links to config pages are present and working

## Implementation Notes

- use dashboard-friendly summaries rather than embedding full management panels
- incomplete facility profile should be computed explicitly, not inferred from vague null checks

## Validation

- dashboard summaries reconcile with underlying feature flag/settings/profile pages
- warning states appear when critical config is missing

## Dependencies

- ADM-03

## Risks

- facility profile completeness rules may need explicit product definition if not already encoded

## Definition of Done

- Administrator dashboard shows live platform-control health and directs the user to the right admin pages