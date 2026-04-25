# FHIR Admin Workspace Gap Analysis

Status: Clear
Last Reviewed: 2026-04-25
Scope: Administrator access to `/admin/fhir`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`, Section 1, Section 4.1, and Section 4.2

## Audit Summary

The current administrator FHIR workspace is aligned with the reviewed TOR requirements.

Verified in this review:

- `/admin/fhir` requires both `admin:view` and `fhir:view`
- backend FHIR endpoints require `admin:view` plus the relevant FHIR permission on all page-backing routes
- the seeded `Administrator` role includes `fhir:view` and `fhir:export` without gaining clinical write permissions
- sidebar, admin overview, and admin dashboard entry points to `/admin/fhir` respect the same FHIR visibility boundary
- admin dashboard summary filtering now strips FHIR-only telemetry when `fhir:view` is absent
- facility isolation is enforced in the FHIR service layer and by database RLS
- export creation, NHDR submission, and bundle download create durable audit/export records
- canonical terminology enforcement is present for ICD-10, SNOMED CT, LOINC, RxNorm, and RVS during export validation

## Remaining Gaps

None identified in the reviewed `/admin/fhir` scope.

## Notes On Unsupported Resource Types

The disabled export resource types currently shown as unsupported (`Immunization`, `Coverage`, `ClaimResponse`) do not create a material TOR gap for this administrator FHIR workspace review.

Reasoning:

- the UI explicitly marks them unavailable instead of implying support
- the backend does not silently export partial data for them
- the TOR requirement reviewed here is active FHIR R4 use for NHDR integration plus strict terminology enforcement, not blanket support for every possible FHIR resource type before the admin workspace can be considered aligned

## Final Assessment

No new tickets are required from this gap analysis. The administrator access model and `/admin/fhir` workspace are aligned with the reviewed TOR requirements.
