# ENC-BE-002 — DPA Consent Validation

**Status:** Open
**Type:** Backend
**Priority:** High
**Blocks:** ENC-BE-001 (encounter creation must call this check)

---

## Summary

Enforce that a valid, active DPA consent record exists for the patient before an encounter can be created. This satisfies RA 10173 (Data Privacy Act) compliance — patients must consent to data processing prior to clinical registration.

---

## Scope

### Validation Logic

Before inserting a new encounter row, the service must verify:

1. A `consentRecords` row exists where:
   - `patientId = input.patientId`
   - `facilityId = requestingStaff.facilityId`
   - `consentType = 'dpa'`
   - `isActive = true`
   - `revokedAt IS NULL`

2. If no matching row found → throw `422 Unprocessable Entity`:
   ```json
   {
     "statusCode": 422,
     "message": "DPA consent is required before creating an encounter.",
     "error": "CONSENT_REQUIRED"
   }
   ```

### Where to Add

`apps/backend/src/modules/v1/encounters/encounters.service.ts` — inside the `create()` method, before the encounter insert.

Use existing `@Inject(DB)` database client to query `consentRecords`.

---

## Technical Context

### Existing Files

- Consent table: `packages/db/src/schema/clinical.ts` → `consentRecords`
- Encounters service: `apps/backend/src/modules/v1/encounters/encounters.service.ts`
- Clinical docs service (reference for consent queries): `apps/backend/src/modules/v1/clinical-docs/clinical-docs.service.ts`

### consentRecords Schema (relevant columns)

```
id, facilityId, encounterId, patientId,
consentType ('general' | 'procedure' | 'research' | 'blood_transfusion' | 'surgery' | 'dpa' | 'nbs'),
isActive, revokedAt, signedAt
```

### Query Pattern

```typescript
import { consentRecords } from "@repo/db/schema"
import { and, eq, isNull } from "drizzle-orm"

const [consent] = await this.db
  .select()
  .from(consentRecords)
  .where(
    and(
      eq(consentRecords.patientId, input.patientId),
      eq(consentRecords.facilityId, facilityId),
      eq(consentRecords.consentType, "dpa"),
      eq(consentRecords.isActive, true),
      isNull(consentRecords.revokedAt),
    )
  )
  .limit(1)

if (!consent) {
  throw new HttpException(
    { statusCode: 422, message: "DPA consent is required before creating an encounter.", error: "CONSENT_REQUIRED" },
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
}
```

---

## Acceptance Criteria

- [ ] Encounter creation returns `422` when no active DPA consent exists for patient
- [ ] Encounter creation proceeds normally when valid DPA consent exists
- [ ] Revoked consent (`revokedAt IS NOT NULL` or `isActive = false`) is treated as absent
- [ ] Error response body contains `error: "CONSENT_REQUIRED"` field
- [ ] No encounter row is inserted when consent check fails (check runs before insert)
