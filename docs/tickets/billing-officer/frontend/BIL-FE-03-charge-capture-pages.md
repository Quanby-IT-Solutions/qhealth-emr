# [BIL-FE-03] Billing — Charge Capture Pages

**Role:** Billing Officer
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 12.1 — Charge Capture
**Flow Refs:** Flow L1 — Charge Capture (USER_FLOWS.md §L1)

## Description

Build the **Charge Capture Page** and **Service Item Page** from Flow L1. The charge capture page auto-pulls charges from CPOE orders, MAR, OR record, and ancillary results, then lets the Biller add manual charges from the service catalog.

## Pages to Build

| Page | Route |
|------|-------|
| Charge Capture Page | `/billing/encounters/[encounterId]/charges` |
| Service Item Page | `/billing/encounters/[encounterId]/charges/add` |

## Functional Requirements (per Flow L1)

- Charge Capture Page tabs: `Auto-Pulled` (read-only sourced charges) and `Manual` (Biller-entered).
- Auto-Pulled tab columns: Source (CPOE/MAR/OR/Ancillary), Date, Item, Qty, Unit Price, Subtotal; pulled-from icon links to the originating chart entry.
- Manual tab uses `LineItemEditor` from BIL-FE-02 with item search via service catalog.
- Footer shows the encounter ledger total with `Ready for Invoicing` CTA that flips status server-side.
- Service Item Page is a search-then-add flow: search box, results list, qty input, add → returns to charge capture.

## Acceptance Criteria

- [ ] Auto-Pulled tab renders skeletons while loading and shows clearly which source each line came from.
- [ ] Each auto-pulled row links to its origin (e.g., CPOE order page) in a new tab.
- [ ] Manual tab reuses `LineItemEditor` and surfaces an inline error if total < 0.
- [ ] `Ready for Invoicing` CTA is disabled until at least one line item exists; clicking it triggers a confirmation dialog summarizing the totals.
- [ ] Service Item Page search debounces 300ms and displays empty / loading / error states.
- [ ] Encounter Context Bar is visible on every page in this flow.
- [ ] Filter bar supports `By Source`, `By Date Range`, and free-text search.

## Dependencies

- BIL-FE-01, BIL-FE-02.
- BIL-BE-02 (charge capture service) for live wiring.

## References

- USER_FLOWS.md §L1.
- USER_STORIES.md §12 Story 12.1.
- TOR §2.13 — RCM scope: clinical charge capture.
