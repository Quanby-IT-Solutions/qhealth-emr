# ENC-BE-001 — Create Encounter API

**Status:** Open
**Type:** Backend
**Priority:** High
**Depends on:** ENC-BE-002 (consent validation), ENC-BE-003 (queue assignment)

---

## Summary

Implement `POST /api/v1/encounters` to create an encounter linked to a patient by MRN, supporting OPD, ER, and IPD encounter types with type-specific field sets.

---

## Scope

### Endpoint

`POST /api/v1/encounters`
Permission required: `adt:create`

### Supported Encounter Types

| Type | DB Value | Description |
|------|----------|-------------|
| OPD  | `outpatient` | Outpatient / clinic visit |
| ER   | `emergency`  | Emergency room |
| IPD  | `inpatient`  | Inpatient admission |

### Request Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `patientId` | UUID | Always | Must be active patient in same facility |
| `encounterType` | enum | Always | `outpatient \| emergency \| inpatient` |
| `chiefComplaint` | string | Always | |
| `attendingStaffId` | UUID | ER / IPD | Staff profile in same facility |
| `bedId` | UUID | IPD | Must be available bed |
| `clinicianStaffId` | UUID | OPD | Clinician for queue assignment |
| `triageIntakeId` | UUID | OPD (optional) | Link existing OPD triage intake |
| `preEncounterId` | UUID | ER (optional) | Link existing pre-encounter (trauma alias) |
| `consentCaptured` | boolean | Always | Must be `true` — enforced by ENC-BE-002 |

### Response

`201 Created` with full encounter object including:
- `id` (UUID, auto-generated)
- `facilityId`
- `patientId`, `mrn` (from patient)
- `encounterType`, `status: "active"`
- `admissionDatetime` (server-set to now)
- `queueNumber` (OPD only, assigned by ENC-BE-003)
- `queueStatus: "waiting"` (OPD only)

---

## Technical Context

### Existing Files

- Controller: `apps/backend/src/modules/v1/encounters/encounters.controller.ts`
- Service: `apps/backend/src/modules/v1/encounters/encounters.service.ts`
- Module: `apps/backend/src/modules/v1/encounters/encounters.module.ts`
- Contract: `packages/contracts/src/modules/v1/encounters/encounters.contract.ts`
- Schema: `packages/contracts/src/modules/v1/encounters/encounters.schema.ts`
- DB Table: `packages/db/src/schema/core.ts` → `encounters`

### DB Schema (encounters table)

Relevant columns: `id`, `facilityId`, `patientId`, `encounterType`, `status`, `chiefComplaint`, `admittingStaffId`, `attendingStaffId`, `clinicianStaffId`, `bedId`, `admissionDatetime`, `queueNumber`, `queueStatus`, `mergedFromPreEncounterId`

### Validation Rules

- `encounterType = outpatient` → `clinicianStaffId` required
- `encounterType = inpatient` → `bedId` + `attendingStaffId` required; bed status must be `available`
- `encounterType = emergency` → `attendingStaffId` required
- Patient must belong to same `facilityId` as requesting staff
- Bed (if provided) must belong to same `facilityId`

### Side Effects on Create

- IPD: set `beds.status = occupied`, `beds.currentEncounterId = encounterId`
- OPD: assign `queueNumber` (see ENC-BE-003)
- All types: set `admissionDatetime = now()`
- Log SLA event: `workflowType` = `opd | ed | admission` based on type

---

## Acceptance Criteria

- [ ] Returns `201` with full encounter object on valid input
- [ ] Returns `422` if `consentCaptured` is not `true`
- [ ] Returns `404` if `patientId` not found in facility
- [ ] Returns `400` if type-required fields are missing (e.g., no `clinicianStaffId` for OPD)
- [ ] Returns `409` if selected bed is not available (IPD)
- [ ] Encounter `status` is `active` on creation
- [ ] `admissionDatetime` is set server-side (not client-provided)
- [ ] Bed status updated to `occupied` for IPD
- [ ] SLA event logged on creation
