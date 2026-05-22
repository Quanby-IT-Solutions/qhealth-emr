# [SCH-BE-02] Scheduler Telemedicine — Business Logic Validation

**Role:** Scheduler
**Layer:** Backend (Service)
**Category:** Business Logic & Validation
**Priority:** P0 (Blocking)
**Story Refs:** User Flow M2, N1
**Flow Refs:** Section M — Scheduling & Appointments, Section N — Telemedicine

## Description

Add business logic validation to the telemedicine service to enforce proper separation between scheduler (administrative) and physician (clinical) roles. Schedulers must assign a physician when booking telemedicine appointments and cannot self-assign as the treating clinician.

## Context

**Problem:**

- Schedulers can now create telemedicine appointments (after SCH-BE-01)
- Without validation, a scheduler could assign themselves as the clinician
- This violates the workflow: schedulers book, physicians treat

**Solution:**
Add validation in `TelemedicineService.createAppointment()` to:

1. Detect if the creator has a Scheduler role
2. Require `clinicianStaffId` to be specified
3. Prevent self-assignment (creator ≠ clinician)
4. Provide clear error messages

## Files to Modify

### Primary File

**Path:** `apps/backend/src/modules/v1/telemedicine/telemedicine.service.ts`

**Method:** `createAppointment(input: CreateAppointmentInput, staffProfileId: string)`

## Implementation

### 1. Add Helper Method to Get User Roles

```typescript
/**
 * Get all roles assigned to a user across their staff profiles
 */
private async getUserRoles(userId: string): Promise<Array<{ id: string; name: string }>> {
  const profiles = await db
    .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
    .from(staffProfiles)
    .innerJoin(userRoles, eq(userRoles.staffProfileId, staffProfiles.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(staffProfiles.userId, userId))

  return profiles.map(p => ({ id: p.roleId, name: p.roleName }))
}

/**
 * Get staff profile with user information
 */
private async getStaffProfileWithUser(staffProfileId: string) {
  const [profile] = await db
    .select({
      id: staffProfiles.id,
      userId: staffProfiles.userId,
      facilityId: staffProfiles.facilityId,
      isActive: staffProfiles.isActive,
    })
    .from(staffProfiles)
    .where(eq(staffProfiles.id, staffProfileId))
    .limit(1)

  if (!profile) {
    throw new NotFoundException(`Staff profile ${staffProfileId} not found`)
  }

  return profile
}
```

### 2. Add Validation Logic in createAppointment()

```typescript
async createAppointment(input: CreateAppointmentInput, staffProfileId: string) {
  // Existing validation (patient, clinician, etc.)...

  // NEW: Scheduler-specific validation
  const creatorProfile = await this.getStaffProfileWithUser(staffProfileId)
  const creatorRoles = await this.getUserRoles(creatorProfile.userId)

  const isScheduler = creatorRoles.some(r => r.name === "Scheduler")
  const isPhysician = creatorRoles.some(r =>
    r.name === "Physician" ||
    r.name === "Surgeon" ||
    r.name === "Anesthesiologist"
  )

  // If user is ONLY a scheduler (not also a physician)
  if (isScheduler && !isPhysician) {
    // Must specify a clinician
    if (!input.clinicianStaffId) {
      throw new BadRequestException(
        "Schedulers must assign a physician to telemedicine appointments. " +
        "Please select a clinician from the dropdown."
      )
    }

    // Cannot self-assign
    if (input.clinicianStaffId === staffProfileId) {
      throw new BadRequestException(
        "Schedulers cannot assign themselves as the treating physician. " +
        "Please select a different clinician."
      )
    }

    // Verify assigned clinician is actually a physician
    const [clinicianProfile] = await db
      .select({ userId: staffProfiles.userId })
      .from(staffProfiles)
      .where(eq(staffProfiles.id, input.clinicianStaffId))
      .limit(1)

    if (clinicianProfile) {
      const clinicianRoles = await this.getUserRoles(clinicianProfile.userId)
      const isClinicianPhysician = clinicianRoles.some(r =>
        r.name === "Physician" ||
        r.name === "Surgeon" ||
        r.name === "Anesthesiologist"
      )

      if (!isClinicianPhysician) {
        throw new BadRequestException(
          "The assigned clinician must have a Physician, Surgeon, or Anesthesiologist role."
        )
      }
    }
  }

  // Continue with existing appointment creation logic...
}
```

### 3. Update Imports

```typescript
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, inArray } from "drizzle-orm"

import {
	roles,
	staffProfiles,
	userRoles,
	// ... existing imports
} from "@repo/db/schema"
```

## Error Messages

| Scenario                            | HTTP Status | Error Message                                                                                                   |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Scheduler doesn't specify clinician | 400         | "Schedulers must assign a physician to telemedicine appointments. Please select a clinician from the dropdown." |
| Scheduler self-assigns              | 400         | "Schedulers cannot assign themselves as the treating physician. Please select a different clinician."           |
| Assigned staff is not a physician   | 400         | "The assigned clinician must have a Physician, Surgeon, or Anesthesiologist role."                              |

## Test Cases

### Unit Tests

**File:** `apps/backend/src/modules/v1/telemedicine/telemedicine-scheduler-validation.spec.ts`

```typescript
describe("TelemedicineService - Scheduler Validation", () => {
	let service: TelemedicineService
	let mockDb: MockDatabase

	beforeEach(() => {
		// Setup mocks
	})

	describe("createAppointment - Scheduler Role", () => {
		it("should allow scheduler to create appointment with valid physician", async () => {
			// Mock: scheduler role, different physician assigned
			const result = await service.createAppointment(
				{
					facilityId: "facility-1",
					patientId: "patient-1",
					clinicianStaffId: "physician-123", // Different from creator
					scheduledDate: "2026-06-01",
					scheduledTime: "10:00",
					platform: "livekit",
				},
				"scheduler-456"
			)

			expect(result.id).toBeDefined()
			expect(result.clinicianStaffId).toBe("physician-123")
		})

		it("should reject when scheduler doesn't specify clinician", async () => {
			await expect(
				service.createAppointment(
					{
						facilityId: "facility-1",
						patientId: "patient-1",
						clinicianStaffId: undefined, // Missing
						scheduledDate: "2026-06-01",
						scheduledTime: "10:00",
					},
					"scheduler-456"
				)
			).rejects.toThrow("Schedulers must assign a physician")
		})

		it("should reject when scheduler self-assigns", async () => {
			await expect(
				service.createAppointment(
					{
						facilityId: "facility-1",
						patientId: "patient-1",
						clinicianStaffId: "scheduler-456", // Same as creator
						scheduledDate: "2026-06-01",
						scheduledTime: "10:00",
					},
					"scheduler-456"
				)
			).rejects.toThrow("cannot assign themselves")
		})

		it("should reject when assigned staff is not a physician", async () => {
			// Mock: assigned staff has Nurse role, not Physician
			await expect(
				service.createAppointment(
					{
						facilityId: "facility-1",
						patientId: "patient-1",
						clinicianStaffId: "nurse-789",
						scheduledDate: "2026-06-01",
						scheduledTime: "10:00",
					},
					"scheduler-456"
				)
			).rejects.toThrow("must have a Physician")
		})

		it("should allow dual-role user (Scheduler + Physician) to self-assign", async () => {
			// Mock: user has both Scheduler AND Physician roles
			const result = await service.createAppointment(
				{
					facilityId: "facility-1",
					patientId: "patient-1",
					clinicianStaffId: "dual-role-123", // Same as creator
					scheduledDate: "2026-06-01",
					scheduledTime: "10:00",
				},
				"dual-role-123"
			)

			expect(result.id).toBeDefined()
			expect(result.clinicianStaffId).toBe("dual-role-123")
		})
	})

	describe("createAppointment - Physician Role", () => {
		it("should allow physician to create and self-assign", async () => {
			// Physicians should not be restricted
			const result = await service.createAppointment(
				{
					facilityId: "facility-1",
					patientId: "patient-1",
					clinicianStaffId: "physician-123", // Same as creator
					scheduledDate: "2026-06-01",
					scheduledTime: "10:00",
				},
				"physician-123"
			)

			expect(result.id).toBeDefined()
		})
	})
})
```

## Acceptance Criteria

- [ ] Helper methods `getUserRoles()` and `getStaffProfileWithUser()` implemented
- [ ] Validation logic added to `createAppointment()` method
- [ ] Scheduler without physician role cannot create appointment without specifying clinician
- [ ] Scheduler cannot self-assign as clinician
- [ ] Scheduler cannot assign non-physician staff as clinician
- [ ] Dual-role users (Scheduler + Physician) can self-assign
- [ ] Pure physicians are not restricted by new validation
- [ ] Clear, actionable error messages returned
- [ ] Unit tests cover all validation scenarios
- [ ] Tests pass with 100% coverage of new code
- [ ] No breaking changes to existing physician workflow

## Dependencies

**Requires:**

- SCH-BE-01 (Migration must run first)
- Existing RBAC schema with roles and userRoles tables

**Blocks:**

- SCH-BE-03 (Enhanced audit logging)
- SCH-FE-01 (Frontend UI)

## Edge Cases

1. **Dual-Role Users:** User has both Scheduler and Physician roles
   - **Behavior:** Allow self-assignment (physician role takes precedence)

2. **Inactive Clinician:** Assigned clinician is inactive
   - **Behavior:** Existing validation should catch this

3. **Cross-Facility Assignment:** Scheduler tries to assign physician from different facility
   - **Behavior:** Existing facility isolation should prevent this

4. **Missing Staff Profile:** staffProfileId doesn't exist
   - **Behavior:** Throw NotFoundException

## Performance Considerations

- Role lookup adds 2 additional DB queries per appointment creation
- Consider caching user roles in session/JWT if this becomes a bottleneck
- Queries use indexed columns (userId, staffProfileId)

## Security Notes

- Validation happens server-side (cannot be bypassed by frontend)
- Uses existing RBAC system (no new security surface)
- Error messages don't leak sensitive information
- Audit logging will track who created appointments (SCH-BE-03)
