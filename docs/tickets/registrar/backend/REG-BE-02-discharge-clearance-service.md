# [REG-BE-02] Discharge Clearance Service

**Role:** Registrar
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 2.6
**Flow Refs:** Flow B6 steps 3–4

## Description

Implement the per-clearance sign-off endpoints that pharmacy, ward nurse, and billing staff use to record their approval before an inpatient encounter can be discharged. Registrar reads these to gate the "Process Discharge" action.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/encounters/:encounterId/clearances` | List all clearances for an encounter (returns `{ pharmacy, nurse, billing }` shape with `clearedBy`, `clearedAt`, `notes`, or `null`). |
| `POST` | `/api/v1/encounters/:encounterId/clearances/:type` | Record clearance. `type` ∈ {`pharmacy`,`nurse`,`billing`}. Body: `{ notes? }`. Idempotent — re-posting updates `clearedAt`. |
| `DELETE` | `/api/v1/encounters/:encounterId/clearances/:type` | Revoke clearance (for corrections; logged to audit). |

## RBAC Mapping

| Clearance Type | Required Permission |
|----------------|----------------------|
| `pharmacy` | `pharmacy.clear_discharge` |
| `nurse` | `nursing.clear_discharge` |
| `billing` | `billing.clear_discharge` |

`cleared_by` is set from `req.session.staffProfileId`. Revocation requires the same permission; full audit trail emitted via existing audit module.

## Service Rules

- Encounter must be in `active` or `pending_discharge` status to accept clearance.
- Re-posting the same type updates `cleared_at` and `notes`, replaces `cleared_by`.
- Emit `discharge.clearance.recorded` event with `{ encounterId, type, clearedBy }`.

## Acceptance Criteria

- [ ] All three clearance types can be POSTed independently and the GET endpoint reflects the state.
- [ ] Unauthorized roles receive 403 with a clear permission name.
- [ ] DELETE writes an audit log entry referencing the original sign-off.
- [ ] Attempting clearance on a `discharged` or `cancelled` encounter returns 400.
- [ ] oRPC contract is exposed; types flow end-to-end from `@repo/contracts`.
- [ ] Unit tests cover: happy path each type, idempotent re-post, unauthorized role, invalid status.

## Dependencies

- REG-BE-01 (`discharge_clearances` table + module scaffold).
- RBAC permissions for the three new actions must be seeded.

## References

- USER_FLOWS.md §B6 steps 3–4
- USER_STORIES.md §2.6
- TOR §2.4
