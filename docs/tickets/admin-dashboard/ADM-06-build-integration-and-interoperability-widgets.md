# ADM-06: Build Integration And Interoperability Dashboard Widgets

## Summary

Implement dashboard widgets for integration registry, FHIR export, and external exchange health.

## Problem

The TOR requires interoperability and administrative oversight of external integrations, but the dashboard does not currently surface failures, blocked submissions, or missing credentials.

## Source References

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `apps/web/app/(site)/admin/integration-registry/page.tsx`
- `apps/web/app/(site)/admin/fhir/page.tsx`
- `apps/web/features/fhir/components/fhir-export-dashboard.tsx`

## Scope

- add widgets for:
  - failed integrations
  - disabled critical integrations
  - missing credential references
  - stale sync timestamps
  - FHIR/NHDR export failures
  - blocked or pending external submissions
- add links into:
  - `/admin/integration-registry`
  - `/admin/fhir`
  - `/reporting`

## Out of Scope

- implementing new partner integrations
- redesigning integration detail pages

## Acceptance Criteria

- Administrator dashboard highlights failing or incomplete integrations
- interoperability failures are visible without navigating into detail pages
- severe failures are visually distinct from informational states
- links land on the correct existing admin/reporting surfaces

## Implementation Notes

- separate operational failure counts from compliance/export failure counts
- stale sync status should include meaningful recency thresholds

## Validation

- seeded/test data shows failing integration and blocked export examples
- dashboard links work correctly
- web typecheck/tests pass for touched files

## Dependencies

- ADM-03

## Risks

- if integration health is not consistently persisted, summaries may require follow-up instrumentation

## Definition of Done

- Administrator dashboard exposes integration and interoperability health in a usable summary form