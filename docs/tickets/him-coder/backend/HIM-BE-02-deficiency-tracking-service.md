# [HIM-BE-02] Chart Deficiency Tracking Service

**Role:** HIM Coder
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 15.1 — Chart Deficiency Tracking
**Flow Refs:** Flow O1

## Description

Detect chart deficiencies after discharge, surface them in a worklist, and notify owners. Auto-detected types: missing physician signature on discharge note, undocumented procedure, missing discharge summary.

## Endpoints (oRPC)

- `him.deficiencies.list` — filters: type, owner, ageBucket, status.
- `him.deficiencies.get`.
- `him.deficiencies.notify` — channel (in-app, email).
- `him.deficiencies.markResolved` — server-side check that the underlying issue is fixed before allowing the transition.
- `him.deficiencies.scan` — scheduled job triggers detection across recent discharges.

## Functional Requirements

- Detection runs as a scheduled job after each discharge transition (event-driven) and as a daily sweep.
- Each deficiency has a deterministic source pointer (note id, order id, etc.).
- Mark Resolved checks the source artifact for the missing element; rejects if still missing.
- Notification dispatching uses the integrations module for delivery; email body is templated.

## Acceptance Criteria

- [ ] Detection covers the three required types and is unit-tested per type.
- [ ] Mark Resolved is rejected when the source still lacks the required artifact.
- [ ] Worklist queries are paginated and indexed.
- [ ] Notify endpoint records every dispatch.
- [ ] Endpoints require `him.deficiencies.read|write` permissions.

## Dependencies

- HIM-BE-01.
- Notes / orders modules (consumed read-only).

## References

- USER_FLOWS.md §O1.
- USER_STORIES.md §15 Story 15.1.
- TOR §1.
