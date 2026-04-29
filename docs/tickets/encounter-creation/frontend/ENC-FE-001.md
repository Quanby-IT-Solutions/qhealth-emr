# ENC-FE-001 — Encounter Creation Page (Tabbed)

**Status:** Open
**Type:** Frontend
**Priority:** High
**Depends on:** ENC-FE-002 (consent modal must fire before submit)

---

## Summary

Implement a tabbed encounter creation form supporting OPD, ER, and IPD encounter types. Each tab exposes the appropriate field set for that encounter type. Submission is gated behind electronic DPA consent capture (ENC-FE-002).

---

## Scope

### Tab Layout

Three tabs using Shadcn `<Tabs>`:

| Tab | Encounter Type (DB) | Key Fields |
|-----|---------------------|------------|
| OPD | `outpatient` | Clinician (required), Chief Complaint, Triage Intake (optional) |
| ER  | `emergency`  | Attending Provider (required), Chief Complaint, Pre-Encounter / Triage Acuity (optional) |
| IPD | `inpatient`  | Attending Provider (required), Ward, Bed (available beds only), Chief Complaint, Admission Datetime |

### Form Behavior

- Active tab sets `encounterType` in the form state
- Switching tabs resets type-specific fields (preserve shared fields like chief complaint)
- Submit button label: "Create Encounter"
- On submit click: open consent modal (ENC-FE-002) before firing mutation
- If consent modal cancelled: do not submit
- If consent captured: call `useCreateEncounterMutation()` with form data + `consentCaptured: true`

### Success State

On `201` response:
- Toast: "Encounter created — Queue #[N]" (OPD) or "Encounter created" (ER/IPD)
- Navigate to encounter detail page or encounter list

### Error State

| Error | Message |
|-------|---------|
| `CONSENT_REQUIRED` (422) | "DPA consent is required. Please capture consent first." |
| `404` patient not found | "Patient not found." |
| `409` bed occupied | "Selected bed is no longer available." |
| Network error | "Failed to create encounter. Please try again." |

---

## Technical Context

### Existing Files

- Form component: `apps/web/features/encounters/components/create-encounter-form.tsx`
- Hooks: `apps/web/features/encounters/api/encounters.hooks.ts` → `useCreateEncounterMutation()`
- oRPC contract: `packages/contracts/src/modules/v1/encounters/encounters.contract.ts`

### New Component (from ENC-FE-002)

- Consent modal: `apps/web/features/encounters/components/consent-capture-modal.tsx`

### Field Components to Reuse

- Staff/clinician picker: check `apps/web/features/` for existing staff select components
- Ward/bed picker: check `apps/web/features/beds/` for available bed selects
- Triage intake selector: check `apps/web/features/opd-triage/` for existing components

### OPD Fields Schema Reference

```typescript
// packages/contracts/src/modules/v1/encounters/encounters.schema.ts
// CreateEncounterSchema — clinicianStaffId + triageIntakeId validation for OPD
```

---

## Acceptance Criteria

- [ ] Three tabs render: OPD, ER, IPD
- [ ] Switching tabs shows the correct field set
- [ ] Submitting without consent modal → consent modal opens (not the API call)
- [ ] After consent captured → mutation fires with correct `encounterType` value
- [ ] OPD missing `clinicianStaffId` → form-level validation error, no submission
- [ ] IPD missing bed → form-level validation error, no submission
- [ ] Success toast shows queue number for OPD
- [ ] 422 `CONSENT_REQUIRED` error shows user-facing message (should not normally occur if modal is enforced)
- [ ] 409 bed conflict shows user-facing message
