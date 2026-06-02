import { Logger } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { AuditService, type DBTransaction } from "./audit.service"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/common/database/database.client", () => ({
	db: {
		insert: jest.fn(),
		select: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	auditLogs: {
		facilityId: "auditLogs.facilityId",
		userId: "auditLogs.userId",
		severity: "auditLogs.severity",
	},
	breakGlassEvents: {
		id: "breakGlassEvents.id",
		facilityId: "breakGlassEvents.facilityId",
		clinicianStaffId: "breakGlassEvents.clinicianStaffId",
		patientId: "breakGlassEvents.patientId",
		accessExpiresAt: "breakGlassEvents.accessExpiresAt",
	},
	patients: { id: "patients.id", mrn: "patients.mrn" },
	rolePermissions: {
		roleId: "rolePermissions.roleId",
		module: "rolePermissions.module",
		action: "rolePermissions.action",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
		facilityId: "staffProfiles.facilityId",
		isActive: "staffProfiles.isActive",
	},
	userRoles: { roleId: "userRoles.roleId", staffProfileId: "userRoles.staffProfileId" },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseEntry = {
	facilityId: "facility-1",
	userId: "user-1",
	staffProfileId: null,
	action: "create" as const,
	entityType: "feature_flag",
	entityId: "flag-1",
	beforeState: null,
	afterState: { name: "my-flag", enabled: false },
	ipAddress: null,
	userAgent: null,
	metadata: null,
}

const createdRow = { id: "audit-1", ...baseEntry, createdAt: new Date() }

function mockDbInsert(returnedRow: unknown) {
	const returning = jest.fn().mockResolvedValue([returnedRow])
	const values = jest.fn().mockReturnValue({ returning })
	;(db.insert as jest.Mock).mockReturnValue({ values })
	return { values, returning }
}

function makeTxInsert(returnedRow: unknown) {
	const returning = jest.fn().mockResolvedValue([returnedRow])
	const values = jest.fn().mockReturnValue({ returning })
	const insert = jest.fn().mockReturnValue({ values })
	const tx = { insert } as unknown as DBTransaction
	return { tx, insert, values, returning }
}

function makeInsertChain(returnedRow: unknown, options?: { reject?: unknown }) {
	const returning = options?.reject
		? jest.fn().mockRejectedValue(options.reject)
		: jest.fn().mockResolvedValue([returnedRow])
	const values = jest.fn().mockReturnValue({ returning })
	const insertResult = { values }
	return { insertResult, values, returning }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuditService.log", () => {
	let service: AuditService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new AuditService()
		// Silence logger noise in tests
		jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
	})

	it("uses the singleton db client when no tx is supplied", async () => {
		const { values, returning } = mockDbInsert(createdRow)

		const result = await service.log(baseEntry)

		expect(db.insert).toHaveBeenCalled()
		expect(values).toHaveBeenCalledWith(expect.objectContaining({ entityType: "feature_flag" }))
		expect(returning).toHaveBeenCalled()
		expect(result).toEqual(createdRow)
	})

	it("uses the provided tx handle when supplied", async () => {
		const { tx, insert, values, returning } = makeTxInsert(createdRow)

		const result = await service.log(baseEntry, { tx })

		// Should use tx.insert, NOT db.insert
		expect(insert).toHaveBeenCalled()
		expect(db.insert).not.toHaveBeenCalled()
		expect(values).toHaveBeenCalledWith(expect.objectContaining({ entityType: "feature_flag" }))
		expect(returning).toHaveBeenCalled()
		expect(result).toEqual(createdRow)
	})

	it("falls back to singleton db when tx option is undefined inside the options object", async () => {
		const { values } = mockDbInsert(createdRow)

		await service.log(baseEntry, { tx: undefined })

		expect(db.insert).toHaveBeenCalled()
		expect(values).toHaveBeenCalled()
	})

	it("throws and logs when the insert fails (no tx)", async () => {
		const insertError = new Error("DB error")
		;(db.insert as jest.Mock).mockReturnValue({
			values: jest.fn().mockReturnValue({
				returning: jest.fn().mockRejectedValue(insertError),
			}),
		})
		const logSpy = jest.spyOn(Logger.prototype, "error")

		await expect(service.log(baseEntry)).rejects.toThrow("DB error")
		expect(logSpy).toHaveBeenCalled()
	})
})

describe("AuditService.createBreakGlass", () => {
	let service: AuditService

	const input = {
		facilityId: "11111111-1111-1111-1111-111111111111",
		patientId: "22222222-2222-2222-2222-222222222222",
		clinicianStaffId: "33333333-3333-3333-3333-333333333333",
		userId: "doctor-user",
		reasonCategory: "code_blue" as const,
		justification: "Code blue response requires immediate chart access.",
		durationHours: 4,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		service = new AuditService()
		jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
	})

	it("creates the break-glass row and critical override audit log in one transaction", async () => {
		const event = {
			id: "44444444-4444-4444-4444-444444444444",
			facilityId: input.facilityId,
			clinicianStaffId: input.clinicianStaffId,
			patientId: input.patientId,
			reasonCategory: input.reasonCategory,
			justification: input.justification,
			accessGrantedAt: new Date(),
			accessExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
			reviewStatus: "pending",
		}
		const auditRow = { id: "audit-override", entityId: event.id, severity: "critical" }
		const eventInsert = makeInsertChain(event)
		const auditInsert = makeInsertChain(auditRow)
		const tx = {
			insert: jest
				.fn()
				.mockReturnValueOnce(eventInsert.insertResult)
				.mockReturnValueOnce(auditInsert.insertResult),
		}
		;(db.transaction as jest.Mock).mockImplementation(async callback => callback(tx))

		const result = await service.createBreakGlass(input)

		expect(result).toEqual(event)
		expect(db.transaction).toHaveBeenCalledTimes(1)
		expect(tx.insert).toHaveBeenCalledTimes(2)
		expect(eventInsert.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: input.facilityId,
				clinicianStaffId: input.clinicianStaffId,
				patientId: input.patientId,
				reasonCategory: input.reasonCategory,
				justification: input.justification,
				reviewStatus: "pending",
			})
		)
		expect(auditInsert.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: input.facilityId,
				userId: input.userId,
				staffProfileId: input.clinicianStaffId,
				action: "override",
				entityType: "break_glass_event",
				entityId: event.id,
				severity: "critical",
				outcome: "success",
				metadata: {
					reasonCategory: input.reasonCategory,
					patientId: input.patientId,
				},
			})
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("rejects the whole transaction when the critical audit log cannot be written", async () => {
		const event = {
			id: "44444444-4444-4444-4444-444444444444",
			facilityId: input.facilityId,
			clinicianStaffId: input.clinicianStaffId,
			patientId: input.patientId,
			reasonCategory: input.reasonCategory,
			justification: input.justification,
			accessGrantedAt: new Date(),
			accessExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
			reviewStatus: "pending",
		}
		const eventInsert = makeInsertChain(event)
		const auditInsert = makeInsertChain(null, { reject: new Error("audit insert failed") })
		const tx = {
			insert: jest
				.fn()
				.mockReturnValueOnce(eventInsert.insertResult)
				.mockReturnValueOnce(auditInsert.insertResult),
		}
		;(db.transaction as jest.Mock).mockImplementation(async callback => callback(tx))

		await expect(service.createBreakGlass(input)).rejects.toThrow("audit insert failed")

		expect(db.transaction).toHaveBeenCalledTimes(1)
		expect(tx.insert).toHaveBeenCalledTimes(2)
		expect(db.insert).not.toHaveBeenCalled()
	})
})
