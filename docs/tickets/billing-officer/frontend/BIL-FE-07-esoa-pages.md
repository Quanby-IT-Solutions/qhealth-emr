# [BIL-FE-07] Billing — eSOA Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 12.5 — Electronic Statement of Account
**Flow Refs:** Flow L5 (USER_FLOWS.md §L5)

## Description

Build the **eSOA Page** and **Statement Preview Page** from Flow L5. Compile the itemized statement in the PhilHealth-compliant XML format and provide a print-friendly preview.

## Pages to Build

| Page | Route |
|------|-------|
| eSOA Page | `/billing/encounters/[encounterId]/esoa` |
| Statement Preview Page | `/billing/encounters/[encounterId]/esoa/preview` |

## Functional Requirements (per Flow L5)

- eSOA Page: header (facility, patient block), itemized lines from invoice, totals, PhilHealth deductions, balance due. CTA `Generate eSOA`.
- Statement Preview Page renders the formatted statement and offers two exports: XML (PhilHealth submission) and PDF (patient copy).
- Send-via options: Patient Portal, Email (placeholder), Print.

## Acceptance Criteria

- [ ] eSOA Page totals tie out exactly to the source invoice; any drift triggers a destructive banner and disables the generate CTA.
- [ ] XML and PDF exports are generated server-side and downloaded via signed URLs.
- [ ] Preview Page renders a true-to-print layout (A4) using `@media print`.
- [ ] Send action records a delivery audit row visible in the activity panel of the page.
- [ ] Empty / loading / error states for both pages.
- [ ] Encounter Context Bar shows the eSOA generation timestamp and version once issued.

## Dependencies

- BIL-FE-01, BIL-FE-02, BIL-FE-04.
- BIL-BE-06 (eSOA service) for live wiring.

## References

- USER_FLOWS.md §L5.
- USER_STORIES.md §12 Story 12.5.
- TOR §2.13 — eSOA in XML format.
