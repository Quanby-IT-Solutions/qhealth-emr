# [REG-BE-06] Housekeeping Role & Notifications

**Role:** Registrar
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 2.9
**Flow Refs:** Flow B7 step 3

## Description

Introduce the `housekeeping` RBAC role with the permissions consumed by REG-BE-05, add a `housekeeping` notifications topic, and push an SSE notification to housekeeping staff each time a bed transitions to `dirty_for_cleaning`.

## RBAC

Seed the `housekeeping` role with permissions:

| Permission | Action |
|------------|--------|
| `housekeeping.view_queue` | List dirty beds |
| `housekeeping.mark_cleaned` | Confirm cleaning |
| `beds.view` | Read bed details |

Add to RBAC seed (`apps/backend/src/modules/v1/rbac/` seed files).

## Notifications

- Extend `notification.service.ts:15` topic enum with `"housekeeping"`.
- Subscribe a listener to `bed.dirtied` (emitted from REG-BE-05).
- Payload: `{ bedId, bedLabel, wardName, dirtiedAt, encounterId }`.
- Fan-out: send to every active session whose user has role `housekeeping` for that facility.

## Acceptance Criteria

- [ ] `housekeeping` role exists post-seed with the three permissions above.
- [ ] `notification.topics` enum includes `housekeeping`; existing topics unaffected.
- [ ] When a bed dirties, all connected housekeeping users for that facility receive an SSE event within 1s.
- [ ] No notification fires for non-housekeeping users.
- [ ] Notification payload contains bedId, bedLabel, wardName, and dirtiedAt.
- [ ] Integration test asserts notification delivery via the SSE test harness.

## Dependencies

- REG-BE-05 (event source)
- Existing RBAC + notifications modules

## References

- USER_FLOWS.md §B7 step 3
- USER_STORIES.md §2.9
- TOR §2.4
- Existing code: `apps/backend/src/modules/v1/notifications/notification.service.ts:15`
