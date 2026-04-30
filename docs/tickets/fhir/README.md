# FHIR Admin Tickets

Status: Clear
Last Reviewed: 2026-04-25
Scope: Administrator access to `/admin/fhir`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`

## Summary

The latest gap analysis found no remaining material TOR-grade gaps for the administrator FHIR workspace. The route, navigation surfaces, backend controller boundary, facility isolation, terminology enforcement, and audit/export logging are aligned with the reviewed TOR requirements.

## Active Tickets

None.

## Notes

- Dedicated `fhir:view` and `fhir:export` permissions are in place for export inspection, creation, submission, and bundle download.
- The `/admin/fhir` page requires both `admin:view` and `fhir:view`.
- The backend FHIR controller requires `admin:view` plus the relevant FHIR permission on all `/admin/fhir`-backing routes.
- The seeded `Administrator` role includes `fhir:view` and `fhir:export` while remaining free of clinical create, edit, sign, verify, or delete authority.
- The broader admin dashboard summary now strips FHIR-only telemetry when `fhir:view` is absent, so the surrounding admin surface respects the same permission boundary.
- The unsupported export resource types currently shown as disabled (`Immunization`, `Coverage`, `ClaimResponse`) do not create a TOR compliance gap for this reviewed `/admin/fhir` scope.