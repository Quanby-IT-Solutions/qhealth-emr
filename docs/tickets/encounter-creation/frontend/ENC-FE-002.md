# ENC-FE-002 — Electronic Consent Capture Modal (DPA)

**Status:** Open
**Type:** Frontend
**Priority:** High
**Blocks:** ENC-FE-001 (consent must be captured before form submission)

---

## Summary

Implement an electronic consent capture modal that opens before encounter creation. The modal displays the DPA consent text, captures a signature, and saves a `consentRecords` entry. Only after successful consent save does the encounter creation proceed.

---

## Scope

### Modal Content

1. DPA consent text (fetch from system settings or embed static text)
2. **Signed By** — text input (patient name or authorized representative)
3. **Relationship** — dropdown: `self | parent | guardian | spouse | other`
4. **Signature** — canvas element for electronic signature (finger/mouse draw)
5. **Clear** button — resets canvas
6. **Submit** — "Capture Consent & Continue" (disabled if canvas empty or fields empty)
7. **Cancel** — closes modal, does NOT proceed to encounter creation

### Flow

```
User clicks "Create Encounter"
  → Consent modal opens
    → User fills signedByName, relationship, draws signature
    → Clicks "Capture Consent & Continue"
      → POST consent record (consentType: 'dpa')
      → On success: close modal, fire create encounter mutation
      → On failure: show error in modal, do NOT close
  → User clicks "Cancel"
    → Modal closes, encounter creation aborted
```

### Consent POST Payload

Sent to the clinical-docs consent endpoint:

```typescript
{
  patientId: string,
  consentType: "dpa",
  signedByName: string,
  relationship: "self" | "parent" | "guardian" | "spouse" | "other",
  signatureData: {
    dataUrl: string,  // base64 PNG from canvas
    capturedAt: string, // ISO timestamp
  },
  signedAt: string, // ISO timestamp
}
```

---

## Technical Context

### New Component

`apps/web/features/encounters/components/consent-capture-modal.tsx`

### Props Interface

```typescript
interface ConsentCaptureModalProps {
  open: boolean
  patientId: string
  onConsented: () => void   // called after successful consent save
  onCancel: () => void
}
```

### Consent Mutation Hook

Check `apps/web/features/clinical-docs/api/` for existing consent mutation hook.
If none exists, create `useCreateConsentMutation()` using:
```typescript
orpc.clinicalDocs.consent.create.mutationOptions({ ... })
```

### Canvas Signature

Use `react-signature-canvas` (check if already in `package.json`) or implement with native `<canvas>` + pointer events. Store as base64 PNG via `canvas.toDataURL("image/png")`.

### Existing Reference

Check `apps/web/features/nursing/` — nursingConsentRecords capture (if exists) may have a signature component pattern to reuse.

---

## Acceptance Criteria

- [ ] Modal opens when "Create Encounter" clicked
- [ ] Cancel aborts encounter creation (no consent saved, no encounter created)
- [ ] Submit disabled until signature drawn AND signedByName filled
- [ ] Successful consent POST saves a `dpa` consent record for the patient
- [ ] After consent saved, encounter mutation fires immediately
- [ ] If consent POST fails → error shown inside modal, modal stays open
- [ ] Canvas can be cleared and redrawn
- [ ] Signature data persists as base64 PNG in `signatureData.dataUrl`
- [ ] Modal is accessible (focus trap, ESC to cancel, ARIA labels)
