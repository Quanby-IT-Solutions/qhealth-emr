# [ADM-BE-08] Terminology Management Service

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P2
**Story Refs:** Story 17.2 — Standardized Terminology Enforcement
**Flow Refs:** Flow Q2

## Description

Manage versioned code systems (ICD-10, SNOMED CT, LOINC, RxNorm, RVS) and their deprecation mappings. Other modules consume the terminology service for code lookups (CPOE drug search via RxNorm, problem list ICD-10, lab orders LOINC, surgical RVS, billing CF4).

## Endpoints (oRPC)

- `admin.terminology.systems.list` — five code systems with version + count.
- `admin.terminology.codes.search` — params: system, query, limit; returns `{ code, display, deprecated, mapped_to? }`.
- `admin.terminology.codes.get`.
- `admin.terminology.import` — upload CSV / FHIR ValueSet JSON; runs validation, reports row errors, commits all-or-nothing.
- `admin.terminology.deprecate` — code → replacement.
- `admin.terminology.versions.diff` — compare two versions of a system.

## Acceptance Criteria

- [ ] Search response time p95 < 100ms on a 50 000-code system (use indexed prefix + trigram search).
- [ ] Import is transactional — partial failure rolls back; duplicate codes in the same import are detected before commit.
- [ ] `deprecate` enforces a non-deprecated replacement target.
- [ ] Diff endpoint returns `added`, `removed`, `display_changed`, `deprecation_added` arrays.
- [ ] Endpoints require `admin.terminology.read` / `admin.terminology.write`.
- [ ] Unit and integration tests cover each endpoint.

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §Q2.
- USER_STORIES.md §17 Story 17.2.
- TOR §4.1 — Standardized terminologies must be strictly enforced.
