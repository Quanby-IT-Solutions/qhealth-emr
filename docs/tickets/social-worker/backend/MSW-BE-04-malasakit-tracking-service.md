# [MSW-BE-04] Malasakit Tracking Service

**Role:** Social Worker
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 12.10 — Malasakit Center Tracking
**Flow Refs:** Flow L10

## Description

Track patient assistance routed through Malasakit (DSWD / PCSO / DOH-MAIFIP) and reconcile with billing.

## Endpoints (oRPC)

- `msw.malasakit.cases.list` — filters: source, status, dateRange.
- `msw.malasakit.cases.create`.
- `msw.malasakit.cases.update`.
- `msw.malasakit.cases.statusLog` — per case.
- `msw.malasakit.cases.reconcile` — link a granted amount to a billing payment.

## Functional Requirements

- Status taxonomy: Pending, Approved, Released, Denied. Transitions are constrained (e.g., Denied terminal except via explicit reopen).
- Multi-source cases aggregate amounts by source.
- Reconciliation creates a corresponding billing-side record (via BIL-BE-03 payment integration).

## Acceptance Criteria

- [ ] Status transitions validated server-side.
- [ ] `Denied` requires a reason field.
- [ ] Reconcile is transactional with billing payment write.
- [ ] Endpoints require `msw.malasakit.read|write` permissions.
- [ ] Audit events emitted on every status change and reconciliation.
- [ ] Unit tests cover transition validity matrix.

## Dependencies

- MSW-BE-01, BIL-BE-03 (payment integration).
- **Consumes BIL-BE-03 via `payments.recordFromMalasakit` hook** — verify shared payment-source enum (`MALASAKIT`) exists in `@repo/contracts` before implementing reconcile. Reconcile must pass `{ source: 'MALASAKIT', malasakitCaseId, amount, reference }` to the BIL-BE-03 endpoint.

## References

- USER_FLOWS.md §L10.
- USER_STORIES.md §12 Story 12.10.
- TOR §1 — MSW liaison.
