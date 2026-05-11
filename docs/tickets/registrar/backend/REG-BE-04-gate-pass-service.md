# [REG-BE-04] Gate Pass Service & QR Generation

**Role:** Registrar
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 2.6
**Flow Refs:** Flow B6 steps 8–10

## Description

Implement the Gate Pass module that issues a printable receipt + QR code after a discharge is finalized, and triggers the bed dirty-for-cleaning transition (REG-BE-05) on release.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/gate-passes` | Create a gate pass for an encounter. Body: `{ encounterId, deliveredVia: "print" \| "qr" \| "both" }`. Returns `{ id, qrToken, encounter, patient }`. |
| `GET` | `/api/v1/gate-passes/:id` | Return printable payload (encounter summary, patient demographics, issued by, timestamps). |
| `GET` | `/api/v1/gate-passes/:id/qr.png` | Stream PNG QR code rendered server-side via `qrcode` npm package. |
| `GET` | `/api/v1/gate-passes/:id/qr.svg` | Same as above, SVG variant for print. |
| `POST` | `/api/v1/gate-passes/:id/mark-printed` | Sets `printedAt`. |

## Service Rules

- Encounter must be `discharged`. Reject otherwise.
- One active gate pass per encounter — re-POST returns existing row.
- `qrToken` is a signed JWT containing `{ gatePassId, encounterId }`, signed with a service secret; verifiable via existing JWT setup.
- On successful create, emit `gate-pass.released` event with `{ gatePassId, encounterId, bedId }`.
- Listener in `beds/` module (REG-BE-05) consumes the event and transitions the bed.

## QR Library

- Add `qrcode` to `apps/backend/package.json`.
- Wrap in a `utils/qr.ts` helper exposing `renderPng(text)` and `renderSvg(text)`.

## Acceptance Criteria

- [ ] `POST /gate-passes` for a `discharged` encounter returns a row with non-null `qrToken`.
- [ ] `POST /gate-passes` for an `active` encounter returns 400.
- [ ] Re-posting for the same encounter returns the same gate-pass row (idempotent).
- [ ] QR endpoints return valid PNG/SVG bytes with correct `Content-Type` headers.
- [ ] `gate-pass.released` event is consumed and bed transitions to `dirty_for_cleaning` (verified via integration test once REG-BE-05 lands).
- [ ] `mark-printed` updates `printedAt` and audits the action.
- [ ] Unit tests cover happy path, re-post idempotency, invalid encounter status, QR rendering.

## Dependencies

- REG-BE-01 (`gate_passes` table)
- REG-BE-03 (encounter must be `discharged`)
- REG-BE-05 (bed transition listener)

## References

- USER_FLOWS.md §B6 steps 8–10
- USER_STORIES.md §2.6
- TOR §2.20 (ARTA Flow 5)
