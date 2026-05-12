# [BIL-FE-05] Billing — CF4 Generation & eClaims Submission Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 12.3 — Automated Claim Form 4 (CF4) Generation
**Flow Refs:** Flow L3 (USER_FLOWS.md §L3)

## Description

Build the **CF4 Generation Page** and **eClaims Submission Page** from Flow L3. Auto-extracted CF4 data (chief complaint, history, vitals, plan, ICD-10) is presented for review, then submitted to PhilHealth eClaims with the strict XML format required by the TOR.

## Pages to Build

| Page | Route |
|------|-------|
| CF4 Generation Page | `/billing/encounters/[encounterId]/cf4` |
| eClaims Submission Page | `/billing/encounters/[encounterId]/cf4/submit` |

## Functional Requirements (per Flow L3)

- CF4 Generation Page two-pane: left = pre-filled form view (sectioned: Patient, Encounter, Clinical Summary, ICD-10, Procedures), right = XML preview via `XmlPreviewPane`.
- Highlight any field auto-extracted from a clinical note with a small `auto` chip; clicking the chip opens the source note in a side drawer.
- Validation badge at top: `Ready to submit` (green) or `Missing fields` (red) with a list of blocking issues.
- eClaims Submission Page shows the claim summary, claim number assigned by the backend, submission status timeline (`ClaimStatusTimeline`), and a `Resubmit` CTA when status = Returned.

## Acceptance Criteria

- [ ] Form layout matches the PhilHealth CF4 sections — Patient, Encounter, Clinical Summary, ICD-10, Procedures, Charges Summary.
- [ ] XML preview reflects every form change in real time and is XSD-validated client-side; invalid states block the submit CTA.
- [ ] Source-note drawer opens without leaving the page and uses `Esc` to close.
- [ ] Submission status timeline auto-refreshes every 60 seconds.
- [ ] Resubmit prompts for a reason and emits the resubmit count badge on the timeline.
- [ ] Empty / loading / error states for both pages.
- [ ] `Ready to submit` badge re-evaluates whenever a chart amendment lands (Story 4.2 dependency).

## Dependencies

- BIL-FE-01, BIL-FE-02.
- BIL-BE-04 (CF4 generator + eClaims client) for live wiring.

## References

- USER_FLOWS.md §L3.
- USER_STORIES.md §12 Story 12.3.
- TOR §2.13 — Automated Claim Form 4 (CF4); strict XML format requirement.
