# [ADM-BE-07] FHIR R4 Endpoint Service (NHDR)

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 17.1 — FHIR R4 Resource Exchange
**Flow Refs:** Flow Q1

## Description

Manage the configuration and execution of FHIR R4 exchanges with the National Health Data Repository (NHDR).

## Endpoints (oRPC)

- `admin.fhirEndpoints.list`, `.get`, `.upsert`, `.delete`.
- `admin.fhirEndpoints.testConnection` — runs a capability statement fetch.
- `admin.fhirEndpoints.exchangeLog.list` — paginated, filters by resource, status, date.
- `admin.fhirEndpoints.exchangeLog.retry`.

## Functional Requirements

- Auth methods supported: OAuth2 client credentials, Bearer token, mTLS (cert refs only — actual cert storage uses the integrations module, ADM-BE-12).
- Sync engine (NestJS scheduled job) iterates configured endpoints and pushes/pulls each enabled FHIR resource type per the schedule.
- Each exchange writes a `fhir_exchange_log` row with status (`success`, `client_error`, `server_error`, `timeout`), retry count, and a payload reference.
- Resource list supported: Patient, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, MedicationAdministration, DiagnosticReport, ServiceRequest, NutritionOrder, ImagingStudy, Practitioner, Location.

## Acceptance Criteria

- [ ] FHIR resources serialized strictly to R4 — schema validation runs before transmission and rejects nonconforming payloads.
- [ ] Test Connection returns: HTTP status, latency, server FHIR version, supported resource summary.
- [ ] Sync job is idempotent — repeated runs do not duplicate `MedicationRequest` or other write payloads (use `meta.versionId`).
- [ ] Retry endpoint requeues a single exchange row.
- [ ] Endpoints require `admin.fhir.read` / `admin.fhir.write` permissions.
- [ ] Integration test against a public HAPI FHIR sandbox confirms successful capability fetch and one successful Patient PUT.

## Dependencies

- ADM-BE-01, ADM-BE-02, ADM-BE-08 (terminology must be loaded so codes resolve correctly).

## References

- USER_FLOWS.md §Q1.
- USER_STORIES.md §17 Story 17.1.
- TOR §4.1 — FHIR R4 mandate, NHDR integration.
