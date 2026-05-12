# [ADM-FE-11] Admin — Facility, Master Data & Integration Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Stories 20.1, 20.2, 20.3 (USER_STORIES.md §20)
**Flow Refs:** Flows T1, T2, T3 (USER_FLOWS.md §T1, §T2, §T3)

## Description

Build all System Administration pages from Flows T1, T2, T3:

- Flow T1: **Facility Settings Page**, **Department Setup Page**, **Ward Configuration Page**.
- Flow T2: **Master Data Dashboard**, **Catalog Editor Page**.
- Flow T3: **Integration Settings Page**, **API Key Management Page**.

## Pages to Build

| Page | Route | Flow |
|------|-------|------|
| Facility Settings Page | `/admin/facility` | T1 |
| Department Setup Page | `/admin/facility/departments` | T1 |
| Ward Configuration Page | `/admin/facility/wards` | T1 |
| Master Data Dashboard | `/admin/master-data` | T2 |
| Catalog Editor Page | `/admin/master-data/[catalogId]` | T2 |
| Integration Settings Page | `/admin/integrations` | T3 |
| API Key Management Page | `/admin/integrations/[integrationId]/keys` | T3 |

## Functional Requirements

- **Facility Settings:** name, DOH license number, level (1–4), accreditations checklist (PhilHealth, ISO 9001, JCI, KonSulta), logo upload. Required fields enforced before save.
- **Department Setup:** CRUD list of departments with type (Clinical, Ancillary, Admin), head, contact.
- **Ward Configuration:** CRUD list of wards; each ward has rooms; each room has beds with status taxonomy from Flow B7 (Available, Occupied, Reserved, Dirty/For Cleaning).
- **Master Data Dashboard:** four catalog cards — Drug Formulary, Lab Catalog, RVS Catalog, ICD-10 Sets — with `Manage` CTA.
- **Catalog Editor:** searchable table per catalog with add/edit/deprecate actions; deprecate requires a replacement code.
- **Integration Settings:** card per integration target — ERP, LIS, PACS, Telemedicine, NHDR — with status indicator (connected, degraded, disconnected) and `Configure` CTA.
- **API Key Management:** generate key, rotate key, revoke key, set webhook URL, test connectivity. Keys are masked by default, revealed in a controlled drawer with a confirmation step.

## Acceptance Criteria

- [ ] Facility Settings save is gated behind a confirmation dialog (`This affects every audit log entry — confirm?`).
- [ ] Ward Configuration uses a tree view (Ward → Rooms → Beds) with drag to reorder rooms.
- [ ] Bed status taxonomy matches Flow B7 exactly: `Available`, `Occupied`, `Reserved`, `Dirty / For Cleaning`.
- [ ] Catalog Editor supports CSV import with row-level validation feedback.
- [ ] Deprecate-with-replacement is enforced — saving a deprecation without a target code is blocked.
- [ ] Integration Settings status chip auto-refreshes every 60 seconds.
- [ ] API key reveal action emits a placeholder audit event hook (`onKeyReveal({ integrationId })`).
- [ ] Key rotation prompts the admin to download the new key once; a second visit shows only the masked tail.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-11 and ADM-BE-12 (facility, master-data, integrations services) for live wiring.

## References

- USER_FLOWS.md §T1, §T2, §T3.
- USER_STORIES.md §20 Stories 20.1, 20.2, 20.3.
- TOR §1 — Admin role; TOR §4.3 — ERP boundary delineation (informs which integrations are in scope).
