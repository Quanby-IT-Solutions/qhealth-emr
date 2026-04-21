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
	},
}))

jest.mock("@repo/db/schema", () => ({
	auditLogs: { facilityId: "facilityId", userId: "userId" },
	breakGlassEvents: {},
	patients: {},
	staffProfiles: {},
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
