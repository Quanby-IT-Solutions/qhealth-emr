# [REG-FE-04] Gate Pass Release Page

**Role:** Registrar
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 2.6
**Flow Refs:** Flow B6 steps 8–10

## Description

Build the Gate Pass Release Page that renders a printable receipt with patient demographics, encounter summary, issued-by info, and a scannable QR code linking back to the gate-pass record.

## Page Route

`/registrar/encounters/[encounterId]/gate-pass` — server component fetches encounter, calls `gate-passes` mutation on the server if no row exists, then renders the receipt.

## Page Layout

1. Header — facility logo, "Gate Pass" title, gate-pass ID, issued-at.
2. Patient block — name, MRN, sex, age, contact.
3. Encounter summary — admission date, discharge date, length of stay, disposition, attending physician, ward/bed.
4. **`GatePassQRCard`** — large QR (≥ 200×200 px on screen, scales for print).
5. Footer — registrar signature line + "This serves as the official patient release pass".
6. Action bar (screen only): **Print**, **Send via SMS** (stubbed if SMS not yet implemented; otherwise calls existing notifications channel), **Back to Discharge Queue**.

## Functional Requirements

- On mount, if no gate-pass exists for the encounter, auto-call `POST /gate-passes` then refetch.
- `Print` triggers `window.print()`; print stylesheet (REG-FE-02) hides nav/action-bar and centers QR.
- `Send via SMS` is gated behind a feature flag — if off, button shows "Coming soon" tooltip.
- On successful create, the bed transition (REG-BE-05) happens server-side; this page may listen for the resulting notification or simply assume server-driven state.

## Acceptance Criteria

- [ ] First visit after discharge auto-creates a gate-pass; subsequent visits return the same record.
- [ ] QR image renders from `/api/v1/gate-passes/:id/qr.png` (or .svg) with correct alt text.
- [ ] Print preview is clean — no navigation chrome, QR centered, patient info legible.
- [ ] Back link returns to the Discharge Processing Page.
- [ ] Error states for the create mutation render a destructive Alert with retry.
- [ ] Mobile viewport: layout collapses to single column, QR stays large enough to scan from another phone.

## Dependencies

- REG-FE-01, REG-FE-02
- REG-BE-04 (gate-pass service)
- REG-FE-07 (hooks)

## References

- USER_FLOWS.md §B6 steps 8–10
- USER_STORIES.md §2.6
