# [BIL-BE-02] Charge Capture Service & API

**Role:** Billing Officer
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 12.1 — Charge Capture
**Flow Refs:** Flow L1

## Description

Pull charges automatically from CPOE orders, MAR, OR records, and ancillary results into an encounter ledger; allow the Biller to add manual charges from the service catalog; mark encounter as `Ready for Invoicing`.

## Endpoints (oRPC)

- `billing.charges.list` — by encounterId, filters: source, dateRange.
- `billing.charges.addManual` — service catalog item + qty.
- `billing.charges.update` — qty / unit price override (manual lines only).
- `billing.charges.remove` — manual lines only.
- `billing.charges.markReadyForInvoicing`.
- `billing.serviceCatalog.search`.

## Functional Requirements

- Auto-pull aggregator listens to domain events from CPOE (`order.signed`), MAR (`med.administered`), OR (`procedure.completed`), and Ancillary (`procedure.ended`) and inserts a `charges` row idempotently.
- Manual lines can be edited or deleted only while invoice is not yet generated.
- `markReadyForInvoicing` flips encounter status; rejected if no charges exist.
- Override of unit price requires a reason and writes audit row.

## Acceptance Criteria

- [ ] Auto-pull is idempotent on `(source, source_ref, encounter_id)`.
- [ ] Service unit tests cover each event source aggregator.
- [ ] `markReadyForInvoicing` transitions are tracked in encounter status history.
- [ ] Audit events emitted for every write.
- [ ] Endpoints require `billing.charges.read|write` permission.

## Dependencies

- BIL-BE-01.
- Upstream event emitters (CPOE/MAR/OR/Ancillary) — out of scope; mock for tests.

## References

- USER_FLOWS.md §L1.
- USER_STORIES.md §12 Story 12.1.
- TOR §2.13.
