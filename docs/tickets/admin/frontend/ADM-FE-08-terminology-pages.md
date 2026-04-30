# [ADM-FE-08] Admin — Terminology Management Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P2
**Story Refs:** Story 17.2 — Standardized Terminology Enforcement (USER_STORIES.md §17)
**Flow Refs:** Flow Q2 — Terminology Management (USER_FLOWS.md §Q2)

## Description

Build the **Terminology Management Page** and **Code Set Page** from Flow Q2. Admin uploads and maps ICD-10, SNOMED CT, LOINC, RxNorm, and RVS catalogs, and maps deprecated codes to current ones.

## Pages to Build

| Page | Route |
|------|-------|
| Terminology Management Page | `/admin/terminology` |
| Code Set Page (per system) | `/admin/terminology/[codeSystem]` |

## Functional Requirements (per Flow Q2)

- Management page: cards for each code system showing current version, last updated, total codes, deprecated count.
- Code Set page: searchable table of codes, with columns Code, Display, Deprecated?, Mapped-To, Effective Date.
- Bulk import drawer: accepts CSV / FHIR ValueSet JSON; shows row-level validation errors before commit.
- Deprecated-mapping editor: select deprecated code → search for replacement → save mapping.
- Diff viewer between catalog versions.

## Acceptance Criteria

- [ ] Five code-system cards render: ICD-10, SNOMED CT, LOINC, RxNorm, RVS.
- [ ] Code Set page handles ≥50 000 rows via virtualization without UI lag.
- [ ] Search supports prefix (`I10`) and full-text (`hypertension`) modes.
- [ ] Import drawer rejects malformed files with line-numbered errors and never partially commits.
- [ ] Deprecated codes are visually struck-through and show their mapping target inline.
- [ ] Version diff viewer shows added / removed / changed counts at the top, then row-level diff.
- [ ] Save action triggers a confirmation dialog because changes propagate to all clinical modules.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-08 (terminology service) for live wiring.

## References

- USER_FLOWS.md §Q2.
- USER_STORIES.md §17 Story 17.2.
- TOR §4.1 — Standardized terminologies (ICD-10/SNOMED CT/LOINC/RxNorm/RVS) must be strictly enforced.
