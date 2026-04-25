# Admin Dashboard Tickets

This folder contains the current TOR-based admin dashboard gap analysis state.

## Inputs Used

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- admin dashboard contracts in `packages/contracts/src/modules/v1/admin-dashboard/`
- admin dashboard backend in `apps/backend/src/modules/v1/admin-dashboard/`
- admin dashboard frontend in `apps/web/features/admin/`
- mounted admin routes under `apps/web/app/(site)/admin/`
- linked governance and reporting surfaces used to verify whether a suspected dashboard gap is already satisfied elsewhere in the product

## Gap Analysis

- `GAP_ANALYSIS.md`

## Current Ticket Set

There are currently no open admin-dashboard TOR gap tickets.

The prior AD-014 through AD-017 tickets were removed after implementation and a fresh repo-backed re-audit on 2026-04-22 found no remaining genuine dashboard compliance gaps.

## Explicitly Covered By The Current Audit

These areas are already covered in the repo and should not be re-ticketed unless a concrete regression is found:

- access governance, roles, users, feature flags, settings, facility profile, and integration registry oversight
- audit, break-glass, and export-compliance privacy evidence
- offline continuity and cache-job oversight
- ARTA workflow queue visibility and step-level open-status monitoring
- statutory readiness for PhilHealth, HAI, PIDSR, civil registry, BOR, death rates, and AHSR metrics
- civil-registry birth-certificate tracking plus NBS timing, consent, waiver, and referral compliance visibility
- HIM operations oversight through admin routes and navigation
- terminology oversight for ICD-10, SNOMED CT, LOINC, RxNorm, and RVS
- medication compliance oversight for generics, dangerous-drug tranche rules, active prescriber-credential validity, CDS, and high-alert verification
- admin FHIR or NHDR export governance and linked reporting drill-down visibility
- data-quality oversight and admin summary widgets already mounted on the main dashboard