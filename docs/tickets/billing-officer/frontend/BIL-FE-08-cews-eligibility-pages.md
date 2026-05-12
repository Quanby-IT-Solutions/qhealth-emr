# [BIL-FE-08] Billing — PhilHealth Eligibility (CEWS) Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P1
**Story Refs:** Story 12.6 — PhilHealth Eligibility (CEWS) Check
**Flow Refs:** Flow L6 (USER_FLOWS.md §L6)

## Description

Build the **Eligibility Check Page** and **Membership Verification Page** from Flow L6. At admission and during billing the Biller verifies PhilHealth membership via CEWS and snapshots the eligibility result to the encounter.

## Pages to Build

| Page | Route |
|------|-------|
| Eligibility Check Page | `/billing/eligibility-check` |
| Membership Verification Page | `/billing/eligibility-check/[memberPin]` |

## Functional Requirements (per Flow L6)

- Eligibility Check Page accepts a PhilHealth PIN (12-digit) with masked input and a `Verify` CTA.
- Membership Verification Page shows: PIN, member name, status (Active / Lapsed / Suspended), benefit balance summary, dependents list.
- `Save to Encounter` CTA snapshots the eligibility response to the encounter for later claim submission.
- Re-verify CTA refreshes the snapshot and highlights any change since the last save.

## Acceptance Criteria

- [ ] PIN input enforces 12-digit format with hyphen formatting (e.g., `12-345678901-2`).
- [ ] Verification page renders with skeleton placeholders during fetch and clear error states for `member not found`, `service unavailable`, and `auth failed`.
- [ ] Saved snapshot includes the verification timestamp and is visible on subsequent encounter pages (CF4, eSOA).
- [ ] Dependents list collapses to a count tile on <768px.
- [ ] `Re-verify` CTA records both the prior and the new snapshot to the audit log.
- [ ] Encounter Context Bar reflects the saved eligibility status.

## Dependencies

- BIL-FE-01, BIL-FE-02.
- BIL-BE-07 (CEWS client) for live wiring.

## References

- USER_FLOWS.md §L6.
- USER_STORIES.md §12 Story 12.6.
- TOR §2.13 — Eligibility Web Services (CEWS).
