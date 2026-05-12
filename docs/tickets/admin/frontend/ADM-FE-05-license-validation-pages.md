# [ADM-FE-05] Admin — Clinician License Management Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 1.4 — Professional License Validation (USER_STORIES.md §1)
**Flow Refs:** Flow A4 — Validate Clinician Licenses (PRC / PTR / PDEA S-2) (USER_FLOWS.md §A4)

## Description

Build the **Clinician License Management Page**, **License Verification Page**, and **License Expiry Alert Banner** from Flow A4. PRC and PTR enforcement underpins every e-Prescription (TOR §2.4). PDEA S-2 enforcement gates List A controlled-drug ordering.

## Pages to Build

| Page | Route |
|------|-------|
| Clinician License Management Page | `/admin/clinician-licenses` |
| License Verification Page | `/admin/clinician-licenses/[clinicianId]` |
| Add/Edit License Drawer | overlay |
| License Expiry Alert Banner | global, on every admin page |

## Functional Requirements (per Flow A4)

- List page: per-clinician row with three license badges (PRC, PTR, PDEA S-2) using `StatusBadge` (Verified, Pending, Expired, Missing).
- Filter by clinician name, license type, status.
- Add License flow: select License Type, enter License Number, Issue Date, Expiry Date, upload supporting document (PDF/image preview before save).
- License Verification Page: side-by-side document viewer + form. CTA `Verify` (calls registry check via ADM-BE-05) and `Mark Pending Review`.
- Expiry Alert Banner: shows on every admin page when any license expires within 30 days, links to the management page.

## Acceptance Criteria

- [ ] License list renders one row per clinician with three badges and an `Expires in N days` chip when ≤30 days remain.
- [ ] Add License drawer accepts only PDF, JPG, PNG ≤10MB; rejects others with an inline error.
- [ ] Document preview renders inside the drawer (no full-page navigation).
- [ ] Verification Page shows the uploaded document on the left, the verification form on the right; layout collapses to stacked on <1024px.
- [ ] Status transitions: Pending → Verified shows a celebration toast; Verified → Expired shows a destructive toast.
- [ ] Banner is dismissible per session but reappears on refresh until expirations are resolved.
- [ ] Empty, loading, and error states for the list and verification pages.

## Dependencies

- ADM-FE-01, ADM-FE-02.
- ADM-BE-05 (license verification service) for live wiring; mock-only acceptable for this ticket.

## References

- USER_FLOWS.md §A4.
- USER_STORIES.md §1 Story 1.4.
- TOR §2.4 — FDA e-Rx Mandates and PDEA S-2 Logic.
- TOR §1 — Clinician role and license validation responsibility.
