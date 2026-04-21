# ADM-07: Build Privacy, Audit, And Break-Glass Dashboard Widgets

## Summary

Implement dashboard widgets for audit visibility, privileged changes, and break-glass review.

## Problem

The TOR requires comprehensive audit trails and special handling of emergency access events, but the dashboard does not currently surface those signals.

## Source References

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `apps/web/app/(site)/audit/page.tsx`
- `apps/web/app/(site)/audit/break-glass/page.tsx`

## Scope

- add widgets for:
  - recent privileged configuration changes
  - recent role/permission changes
  - recent break-glass events
  - recent high-severity audit events
- add links into:
  - `/audit`
  - `/audit/break-glass`

## Out of Scope

- long-form audit analytics
- retention/archive tooling

## Acceptance Criteria

- dashboard displays recent audit and break-glass summaries
- urgent review items are visually prominent
- events are grouped by severity or type where practical
- Administrator can jump directly into audit review surfaces

## Implementation Notes

- if Auditor/Privacy Officer should retain more audit detail than Administrator, scope the dashboard data accordingly
- use concise summary lists, not a full audit table clone

## Validation

- seeded or fixture data shows recent audit activity
- break-glass events surface prominently when present
- permission checks are respected

## Dependencies

- ADM-03

## Risks

- privacy boundaries may require clarifying whether Administrator can see all audit details or only governance-relevant summaries

## Definition of Done

- Administrator dashboard includes meaningful audit and emergency-access visibility