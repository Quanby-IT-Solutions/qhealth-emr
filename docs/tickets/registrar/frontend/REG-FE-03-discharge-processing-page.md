# [REG-FE-03] Discharge Processing Page

**Role:** Registrar
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 2.6
**Flow Refs:** Flow B6 steps 3–7

## Description

Build the Discharge Processing Page by extending the existing `DischargePanel` at `apps/web/features/encounters/components/discharge-panel.tsx`. Add the pharmacy/nurse/billing clearance sign-off section, length-of-stay readout, and Gross/Net death-rate banner. The "Process Discharge" CTA stays disabled until all clearances are green and prerequisites met.

## Page Route

`/registrar/encounters/[encounterId]/discharge` — server component prefetches encounter + clearances; renders the panel client-side.

## Page Layout (top → bottom)

1. **Encounter Context Bar** (existing).
2. **May Go Home Order** (existing).
3. **`ClearanceChecklistCard`** (new) — three rows:
   - Pharmacy clearance · Nurse ward clearance · Billing sign-off.
   - Each row shows: type label, status badge (Pending / Cleared), cleared-by + time when cleared, sign-off button visible only to the matching role.
4. **`LengthOfStayDisplay`** (new) — live counter while encounter is open; final value once `dischargeDatetime` is set.
5. **Disposition selector** (existing).
6. **Death-report alert** (existing).
7. **`DeathClassificationBanner`** (new) — visible only when disposition=`deceased`. Shows Gross / Net based on existing death report + admission datetime. Read from `encounter.deathRateClassification` if set, else compute client-side from death-report `deathDatetime`.
8. **Process Discharge CTA** — disabled until: MGHO signed, disposition selected, death report complete (if needed), and all three clearances cleared.

## Functional Requirements

- Clearance sign-off button calls `useRecordClearanceMutation(type)`; on success invalidates the clearance query.
- "Process Discharge" calls `useDischargeEncounterMutation` (existing) — backend gating (REG-BE-03) is authoritative; UI gating is purely UX.
- After successful discharge, navigate to `/registrar/encounters/:encounterId/gate-pass`.
- A small "Print Discharge Summary" link near the bottom (uses existing clinical-abstract dialog for OPD; for inpatient, link to chart).

## Acceptance Criteria

- [ ] All three clearance rows render with correct role-gated buttons and live status updates.
- [ ] LOS counter updates each minute while open and freezes after discharge.
- [ ] Gross/Net banner renders only when disposition=`deceased` and reflects the correct classification.
- [ ] Process Discharge CTA disabled state reacts to every prerequisite change.
- [ ] On success, the user is routed to the gate-pass page.
- [ ] Empty/loading/error states present for clearance query.
- [ ] Page passes a manual a11y smoke (keyboard navigation reaches every actionable element).

## Dependencies

- REG-FE-01, REG-FE-02
- REG-BE-02, REG-BE-03 (live wiring)
- REG-FE-07 (hooks)

## References

- USER_FLOWS.md §B6 steps 3–7
- USER_STORIES.md §2.6
- Existing: `apps/web/features/encounters/components/discharge-panel.tsx`
