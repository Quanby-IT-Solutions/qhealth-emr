# [MSW-BE-05] Ancillary Service Clearance Service

**Role:** Social Worker
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 12.11 — Ancillary Service Clearance
**Flow Refs:** Flow L11

## Description

Apply Malasakit / PhilHealth coverage at the point of an ancillary order so the order status flips from `Pending Payment` to `Cleared for Procedure`.

## Endpoints (oRPC)

- `msw.ancillary.queue` — list orders awaiting clearance, filters by ancillary type and wait time.
- `msw.ancillary.applyCoverage` — input: orderId, coverageSources[], reason; flips order status atomically.
- `msw.ancillary.override` — clear without coverage with required reason.
- `msw.ancillary.history` — per order.

## Functional Requirements

- Apply Coverage writes a clearance row, updates the order's status via the ancillary module's domain event (`order.cleared`), and emits an audit row.
- Coverage sources accept Malasakit case id, PhilHealth eligibility snapshot id, or CoE id; service validates each reference exists for the same encounter.
- Override path requires manager approval flag (configurable per facility).

## Acceptance Criteria

- [ ] Apply Coverage is transactional — status, clearance row, event, and audit are all-or-nothing.
- [ ] Override requires the manager-approval flag for the facility (admin master-data).
- [ ] Endpoint rejects coverage from a different encounter.
- [ ] Endpoints require `msw.ancillary.read|write` permissions.
- [ ] Integration tests cover happy path, override, mismatched encounter, missing coverage source.

## Dependencies

- MSW-BE-01.
- Ancillary order module (out of scope; events mocked for tests).

## References

- USER_FLOWS.md §L11.
- USER_STORIES.md §12 Story 12.11.
- TOR §6 — ARTA Flow 3, Flow 6.
