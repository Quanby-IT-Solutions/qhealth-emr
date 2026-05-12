# [HIM-FE-03] HIM — ICD-10 Coding Pages

**Role:** HIM Coder
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 15.2 — ICD-10 Coding
**Flow Refs:** Flow O2 (USER_FLOWS.md §O2)

## Description

Build the **ICD-10 Coding Page** and **Code Lookup Page** from Flow O2. Assign primary + secondary ICD-10 codes to each completed encounter; validate against AHSR Top-10 mortality/morbidity rules.

## Pages to Build

| Page | Route |
|------|-------|
| ICD-10 Coding Page | `/him/coding/[encounterId]` |
| Code Lookup Page | overlay or dedicated `/him/coding/lookup` |

## Functional Requirements (per Flow O2)

- Coding Page split-pane: left = documented diagnoses pulled from finalized notes, problem list, discharge summary; right = code assignment editor.
- Code editor rows: `Primary` slot (single), `Secondary` (multi). Each row links to its source diagnosis; the `Source` chip opens a side drawer with the originating note.
- Code Lookup is a fast searchable picker — search by code prefix or term; deprecated codes show their replacement and require switching to the replacement.
- AHSR validation banner: highlights when the assigned codes do not yet hit the facility's Top-10 mortality/morbidity validation rules; non-blocking.
- CTA `Sign Coding` locks codes for billing (CF4/CF5 dependency).

## Acceptance Criteria

- [ ] Each row in the editor must be linked to either a documented diagnosis or include an explanatory note.
- [ ] Sign Coding requires at least one Primary code.
- [ ] Lookup search response p95 <200ms in UI; debounced 250ms.
- [ ] Deprecated codes are visually struck-through and replaceable in one click.
- [ ] Once signed, the page becomes read-only with an `Amend` CTA that creates a new version (audit trail visible).
- [ ] Encounter Context Bar visible on the page.
- [ ] Empty / loading / error states.

## Dependencies

- HIM-FE-01, ADM-FE-02.
- HIM-BE-03 (coding service) and ADM-BE-08 (terminology) for live wiring.

## References

- USER_FLOWS.md §O2.
- USER_STORIES.md §15 Story 15.2.
- TOR §1 — HIM Coder: 100% accurate ICD-10 coding for top mortalities and morbidities.
- TOR §3 — AHSR.
