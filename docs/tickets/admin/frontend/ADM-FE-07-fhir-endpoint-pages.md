# [ADM-FE-07] Admin — FHIR Endpoint Configuration Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 17.1 — FHIR R4 Resource Exchange (USER_STORIES.md §17)
**Flow Refs:** Flow Q1 — Configure FHIR Endpoints (USER_FLOWS.md §Q1)

## Description

Build the **FHIR Endpoint Configuration Page** and **FHIR Exchange Log Page** from Flow Q1. Admin configures the National Health Data Repository (NHDR) endpoint URL, auth credentials, and the list of FHIR R4 resources to expose.

## Pages to Build

| Page | Route |
|------|-------|
| FHIR Endpoint Configuration Page | `/admin/fhir-endpoints` |
| FHIR Exchange Log Page | `/admin/fhir-endpoints/log` |
| Test-Connection Drawer | overlay |

## Functional Requirements (per Flow Q1)

- Endpoint form: NHDR URL, auth method (OAuth2 / Bearer / mTLS), client ID, scopes, sync schedule (cron expression with helper), retry policy.
- FHIR resources multi-select: Patient, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, MedicationAdministration, DiagnosticReport, ServiceRequest, NutritionOrder, ImagingStudy, Practitioner, Location.
- Test Connection drawer: runs a server-side ping, shows status code, latency, returned capability statement summary.
- Exchange Log Page: paginated table (timestamp, resource, direction, status, retry count, link to payload).

## Acceptance Criteria

- [ ] Configuration form is a single page with collapsible sections (Endpoint, Auth, Resources, Schedule).
- [ ] Auth fields are masked, with a `reveal` toggle that audits to the activity log (placeholder hook).
- [ ] FHIR resource picker is searchable and supports `select all` per resource category.
- [ ] Test Connection shows three states: in-progress (spinner), success (latency badge), failure (error code + message).
- [ ] Exchange Log table supports filter by resource, status, date range; rows are virtualized when count >100.
- [ ] Failed exchanges have a `Retry` action that calls a dedicated mutation hook (mock-only here).
- [ ] Page is reachable via Admin Shell `Reporting & Compliance` group.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-07 (FHIR endpoint service) for live wiring.

## References

- USER_FLOWS.md §Q1.
- USER_STORIES.md §17 Story 17.1.
- TOR §4.1 — Interoperability and FHIR R4 mandate; NHDR integration.
