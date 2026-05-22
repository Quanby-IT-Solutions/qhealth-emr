# [SCH-BE-03] Scheduler Telemedicine — Enhanced Audit Logging

**Role:** Scheduler
**Layer:** Backend (Service)
**Category:** Audit & Compliance
**Priority:** P1
**Story Refs:** User Flow M2, N1, A6 (Auditor Review)
**Flow Refs:** Section M — Scheduling, Section N — Telemedicine, Section A — Security

## Description

Enhance the telemedicine audit logging system to capture role information when schedulers perform telemedicine actions. This enables auditors to distinguish between scheduler-initiated bookings and physician-initiated clinical actions, supporting compliance and security reviews.

## Context

**Current State:**

- Telemedicine actions are audited with user ID and staff profile
- Role information is not captured in audit metadata
- Auditors cannot easily identify scheduler vs physician actions

**Enhancement:**
Add role context to audit logs:

- Which roles the user has (e.g., ["Scheduler"], ["Physician"], ["Scheduler", "Physician"])
- Whether the action was performed by a scheduler
- Preserve existing audit fields (user, facility, IP, timestamp)

## Files to Modify

### Primary File

**Path:** `apps/backend/src/modules/v1/telemedicine/telemedicine.service.ts`

**Method:** `writeTelemedicineAudit()`

## Implementation

### 1. Update Audit Method Signature

```typescript
private async writeTelemedicineAudit(input: {
  action: string
  entityType: string
  entityId: string
  facilityId: string
  staffProfileId: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    // NEW: Fetch role information if staffProfileId provided
    let roleContext: {
      userRoles: string[]
      isSchedulerAction: boolean
      isPhysicianAction: boolean
    } | null = null

    if (input.staffProfileId) {
      const profile = await this.getStaffProfileWithUser(input.staffProfileId)
      const roles = await this.getUserRoles(profile.userId)

      roleContext = {
        userRoles: roles.map(r => r.name),
        isSchedulerAction: roles.some(r => r.name === "Scheduler"),
        isPhysicianAction: roles.some(r =>
          r.name === "Physician" ||
          r.name === "Surgeon" ||
          r.name === "Anesthesiologist"
        ),
      }
    }

    // Write audit log with enhanced metadata
    await this.auditService.log({
      userId: input.staffProfileId
        ? (await this.getStaffProfileWithUser(input.staffProfileId)).userId
        : TelemedicineService.ANONYMOUS_USER_ID,
      facilityId: input.facilityId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: {
        ...input.metadata,
        // NEW: Role context
        ...(roleContext && {
          userRoles: roleContext.userRoles,
          isSchedulerAction: roleContext.isSchedulerAction,
          isPhysicianAction: roleContext.isPhysicianAction,
        }),
      },
    })
  } catch (error) {
    // Log error but don't fail the operation
    this.logger.error(
      `Failed to write telemedicine audit (${input.entityType}/${input.action}/${input.entityId}): ${error}`
    )
  }
}
```

### 2. Update Audit Calls in Key Methods

No changes needed to existing audit calls - they will automatically include role context.

Example existing call (no modification required):

```typescript
await this.writeTelemedicineAudit({
	action: "create",
	entityType: "telemedicine_appointment",
	entityId: created.id,
	facilityId: input.facilityId,
	staffProfileId,
	metadata: {
		patientId: input.patientId,
		scheduledDate: input.scheduledDate,
		platform: input.platform,
	},
})
```

### 3. Add Audit Query Helpers (Optional Enhancement)

**File:** `apps/backend/src/modules/v1/audit/audit.service.ts`

```typescript
/**
 * Query telemedicine actions by role
 */
async queryTelemedicineActionsByRole(input: {
  facilityId: string
  roleFilter?: "scheduler" | "physician"
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const conditions = [
    eq(auditLogs.facilityId, input.facilityId),
    like(auditLogs.entityType, "telemedicine_%"),
  ]

  if (input.startDate) {
    conditions.push(gte(auditLogs.createdAt, input.startDate))
  }
  if (input.endDate) {
    conditions.push(lte(auditLogs.createdAt, input.endDate))
  }

  let query = db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(input.limit ?? 100)

  const results = await query

  // Filter by role if specified
  if (input.roleFilter) {
    return results.filter(log => {
      const metadata = log.metadata as Record<string, unknown>
      if (input.roleFilter === "scheduler") {
        return metadata.isSchedulerAction === true
      } else if (input.roleFilter === "physician") {
        return metadata.isPhysicianAction === true
      }
      return true
    })
  }

  return results
}
```

## Audit Log Schema

### Enhanced Metadata Structure

```typescript
interface TelemedicineAuditMetadata {
	// Existing fields
	patientId?: string
	scheduledDate?: string
	platform?: string
	// ... other existing fields

	// NEW: Role context fields
	userRoles?: string[] // e.g., ["Scheduler"], ["Physician", "Surgeon"]
	isSchedulerAction?: boolean // true if user has Scheduler role
	isPhysicianAction?: boolean // true if user has Physician/Surgeon/Anesthesiologist role
}
```

### Example Audit Log Entries

**Scheduler books appointment:**

```json
{
	"userId": "user-123",
	"facilityId": "facility-1",
	"action": "create",
	"entityType": "telemedicine_appointment",
	"entityId": "appt-456",
	"metadata": {
		"patientId": "patient-789",
		"scheduledDate": "2026-06-01",
		"platform": "livekit",
		"userRoles": ["Scheduler"],
		"isSchedulerAction": true,
		"isPhysicianAction": false
	},
	"createdAt": "2026-05-22T10:30:00Z"
}
```

**Physician signs prescription:**

```json
{
	"userId": "user-456",
	"facilityId": "facility-1",
	"action": "sign",
	"entityType": "telemedicine_prescription",
	"entityId": "rx-789",
	"metadata": {
		"prescriptionId": "rx-789",
		"userRoles": ["Physician"],
		"isSchedulerAction": false,
		"isPhysicianAction": true
	},
	"createdAt": "2026-05-22T11:45:00Z"
}
```

**Dual-role user:**

```json
{
	"userId": "user-789",
	"facilityId": "facility-1",
	"action": "create",
	"entityType": "telemedicine_appointment",
	"entityId": "appt-999",
	"metadata": {
		"patientId": "patient-111",
		"userRoles": ["Scheduler", "Physician"],
		"isSchedulerAction": true,
		"isPhysicianAction": true
	},
	"createdAt": "2026-05-22T14:20:00Z"
}
```

## Auditor Query Examples

### 1. Find all scheduler-initiated telemedicine bookings

```sql
SELECT
  al.created_at,
  al.user_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata->>'userRoles' as user_roles
FROM audit_logs al
WHERE al.facility_id = 'facility-1'
  AND al.entity_type LIKE 'telemedicine_%'
  AND al.metadata->>'isSchedulerAction' = 'true'
ORDER BY al.created_at DESC
LIMIT 100;
```

### 2. Find appointments booked by schedulers but not yet completed

```sql
SELECT
  ta.id,
  ta.scheduled_date,
  ta.status,
  al.created_at as booked_at,
  al.metadata->>'userRoles' as booked_by_roles
FROM telemedicine_appointments ta
INNER JOIN audit_logs al ON al.entity_id = ta.id::text
WHERE al.entity_type = 'telemedicine_appointment'
  AND al.action = 'create'
  AND al.metadata->>'isSchedulerAction' = 'true'
  AND ta.status IN ('scheduled', 'in-progress')
ORDER BY ta.scheduled_date;
```

### 3. Compare scheduler vs physician action volumes

```sql
SELECT
  al.metadata->>'isSchedulerAction' as is_scheduler,
  al.action,
  COUNT(*) as action_count
FROM audit_logs al
WHERE al.facility_id = 'facility-1'
  AND al.entity_type LIKE 'telemedicine_%'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY al.metadata->>'isSchedulerAction', al.action
ORDER BY action_count DESC;
```

## Test Cases

### Unit Tests

**File:** `apps/backend/src/modules/v1/telemedicine/telemedicine-audit-logging.spec.ts`

```typescript
describe("TelemedicineService - Enhanced Audit Logging", () => {
	let service: TelemedicineService
	let auditService: AuditService
	let mockDb: MockDatabase

	beforeEach(() => {
		auditService = {
			log: jest.fn().mockResolvedValue(undefined),
		} as unknown as AuditService
		// Setup service with mocked audit service
	})

	it("should include role context when scheduler creates appointment", async () => {
		// Mock: user has Scheduler role
		await service.createAppointment(
			{
				facilityId: "facility-1",
				patientId: "patient-1",
				clinicianStaffId: "physician-123",
				scheduledDate: "2026-06-01",
				scheduledTime: "10:00",
			},
			"scheduler-456"
		)

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "telemedicine_appointment",
				metadata: expect.objectContaining({
					userRoles: ["Scheduler"],
					isSchedulerAction: true,
					isPhysicianAction: false,
				}),
			})
		)
	})

	it("should include role context when physician signs prescription", async () => {
		// Mock: user has Physician role
		await service.signPrescription(
			{
				id: "rx-123",
			},
			"physician-789"
		)

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "sign",
				entityType: "telemedicine_prescription",
				metadata: expect.objectContaining({
					userRoles: ["Physician"],
					isSchedulerAction: false,
					isPhysicianAction: true,
				}),
			})
		)
	})

	it("should handle dual-role users correctly", async () => {
		// Mock: user has both Scheduler and Physician roles
		await service.createAppointment(
			{
				facilityId: "facility-1",
				patientId: "patient-1",
				clinicianStaffId: "dual-role-123",
				scheduledDate: "2026-06-01",
				scheduledTime: "10:00",
			},
			"dual-role-123"
		)

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					userRoles: expect.arrayContaining(["Scheduler", "Physician"]),
					isSchedulerAction: true,
					isPhysicianAction: true,
				}),
			})
		)
	})

	it("should not fail operation if audit logging fails", async () => {
		auditService.log = jest.fn().mockRejectedValue(new Error("Audit DB down"))

		// Should still succeed
		const result = await service.createAppointment(
			{
				facilityId: "facility-1",
				patientId: "patient-1",
				clinicianStaffId: "physician-123",
				scheduledDate: "2026-06-01",
				scheduledTime: "10:00",
			},
			"scheduler-456"
		)

		expect(result.id).toBeDefined()
	})
})
```

## Acceptance Criteria

- [ ] `writeTelemedicineAudit()` method enhanced with role context
- [ ] Role information fetched from RBAC system
- [ ] Audit metadata includes `userRoles`, `isSchedulerAction`, `isPhysicianAction`
- [ ] Existing audit calls automatically include new fields (no changes needed)
- [ ] Audit logging failures don't break operations
- [ ] Unit tests verify role context is captured correctly
- [ ] Auditor can query logs by role (scheduler vs physician)
- [ ] Performance impact is minimal (role lookup cached in method)
- [ ] Backward compatible with existing audit log queries

## Dependencies

**Requires:**

- SCH-BE-01 (Migration)
- SCH-BE-02 (Business validation with role helpers)
- Existing audit service and schema

**Blocks:**

- None (can be implemented independently)

## Performance Considerations

- Adds 2 DB queries per audit log write (role lookup)
- Consider caching user roles in request context if performance becomes an issue
- Audit logging is already async and non-blocking
- Failed audit writes are logged but don't fail operations

## Security & Compliance Benefits

1. **Audit Trail:** Clear record of who (by role) performed each action
2. **Compliance:** Supports regulatory requirements for role-based access tracking
3. **Security Reviews:** Enables detection of unusual patterns (e.g., scheduler performing clinical actions)
4. **Accountability:** Links actions to specific roles for investigations
5. **Analytics:** Enables workflow analysis (scheduler booking patterns, physician response times)

## Future Enhancements

- Add role-based audit log filtering in admin dashboard
- Create alerts for suspicious role-action combinations
- Generate compliance reports by role
- Track role changes over time in audit logs
