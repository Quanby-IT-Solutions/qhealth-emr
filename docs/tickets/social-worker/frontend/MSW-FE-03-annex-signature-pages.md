# [MSW-FE-03] Social Worker — PhilHealth Annex A & B Signature Pages

**Role:** Social Worker
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 12.9 — PhilHealth Annex A & B Digital Signature Capture
**Flow Refs:** Flow L9 (USER_FLOWS.md §L9)

## Description

Build the **Annex A/B Signature Page** and **Signed Forms Archive** from Flow L9. Tablet-friendly layout for in-person signature capture during financial evaluations for capitation and Z-Benefits.

## Pages to Build

| Page | Route |
|------|-------|
| Annex A/B Signature Page | `/msw/encounters/[encounterId]/annex` |
| Signed Forms Archive | `/msw/signed-forms` |

## Functional Requirements (per Flow L9)

- Annex Signature Page: tabbed layout — `Annex A — Informed Consent` / `Annex B — Member Empowerment`.
- Each tab renders the official Annex text in a scrollable pane (must scroll to bottom before signing to enforce read).
- Signature pad uses pressure-sensitive capture (HTML Canvas or compatible library).
- Witness signature section (Social Worker) co-signs.
- After both annexes are signed, `Submit and Archive` packages signed PDFs and attaches to the encounter.
- Archive Page: searchable list of all signed annexes (patient, encounter, date, type, signed-by). Click row to view PDF.

## Acceptance Criteria

- [ ] Sign button is disabled until the user has scrolled to the bottom of the consent text.
- [ ] Signature canvas supports `Clear` and `Save`; touch input is supported on tablets.
- [ ] Submission generates one PDF per annex with patient details, date, signature image, witness signature.
- [ ] Archive Page filters by patient, date range, annex type.
- [ ] PDFs open in a side drawer; download CTA is available.
- [ ] Page is responsive: layout collapses gracefully on a 10" tablet (1280×800).
- [ ] Encounter Context Bar visible while signing.

## Dependencies

- MSW-FE-01, ADM-FE-02.
- MSW-BE-03 (signature archive service) for live wiring.

## References

- USER_FLOWS.md §L9.
- USER_STORIES.md §12 Story 12.9.
- TOR §1 — MSW responsibility: secures and digitally archives signatures for PhilHealth Annex A and B.
