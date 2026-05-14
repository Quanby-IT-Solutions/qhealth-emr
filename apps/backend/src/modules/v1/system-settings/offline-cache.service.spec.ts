import { db } from "@/common/database/database.client"

import { OfflineCacheService } from "./offline-cache.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	allergies: {},
	beds: {},
	encounters: {},
	medicationOrders: {},
	offlineCacheJobs: { id: "id", facilityId: "facilityId", status: "status" },
	offlinePatientSummaries: {
		facilityId: "facilityId",
		patientId: "patientId",
		summaryPayload: "summaryPayload",
		preparedAt: "preparedAt",
	},
	patients: {
		id: "id",
		mrn: "mrn",
		firstName: "firstName",
		middleName: "middleName",
		lastName: "lastName",
		dateOfBirth: "dateOfBirth",
		sex: "sex",
		isActive: "isActive",
		facilityId: "facilityId",
	},
	problems: {},
	staffProfiles: {},
	systemSettings: {
		facilityId: "facilityId",
		enableOfflineSummaryCache: "enableOfflineSummaryCache",
	},
	users: {},
	vitalSigns: {},
	wards: {},
}))

function selectLimitRows(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				limit: jest.fn().mockResolvedValue(rows),
			}),
		}),
	}
}

function selectOrderedRows(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				orderBy: jest.fn().mockResolvedValue(rows),
			}),
		}),
	}
}

function insertJob(jobId = "660e8400-e29b-41d4-a716-446655440000") {
	return {
		values: jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue([{ id: jobId }]),
		}),
	}
}

function insertSummary() {
	return {
		values: jest.fn().mockReturnValue({
			onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

function updateJob() {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

describe("OfflineCacheService", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("prepares one persisted summary per active patient and records completed count", async () => {
		const service = new OfflineCacheService()
		const preparedAt = "2026-05-14T00:00:00.000Z"
		const patient = {
			id: "770e8400-e29b-41d4-a716-446655440000",
			mrn: "MRN-20260514-0001",
			firstName: "Ana",
			middleName: null,
			lastName: "Santos",
			dateOfBirth: "1980-01-01",
			sex: "female",
			isActive: true,
		}

		;(service as unknown as { buildPatientSummaryPayload: jest.Mock }).buildPatientSummaryPayload =
			jest.fn().mockResolvedValue({
				schemaVersion: 1,
				facilityId: "550e8400-e29b-41d4-a716-446655440000",
				patient,
				encounterSummary: null,
				preparedAt,
				sourceJobId: "660e8400-e29b-41d4-a716-446655440000",
			})

		;(db.select as jest.Mock)
			.mockReturnValueOnce(selectLimitRows([{ enableOfflineSummaryCache: true }]))
			.mockReturnValueOnce(selectOrderedRows([patient]))
		;(db.insert as jest.Mock).mockReturnValueOnce(insertJob()).mockReturnValueOnce(insertSummary())
		;(db.update as jest.Mock).mockReturnValue(updateJob())

		const result = await service.runJobForFacility(
			"550e8400-e29b-41d4-a716-446655440000",
			"scheduler"
		)

		expect(result.status).toBe("completed")
		expect(result.cachedPatientCount).toBe(1)
		expect(db.insert).toHaveBeenCalledTimes(2)
		expect(db.update).toHaveBeenCalledTimes(1)
	})

	it("marks the job failed when summary preparation throws", async () => {
		const service = new OfflineCacheService()
		const patient = {
			id: "770e8400-e29b-41d4-a716-446655440000",
			mrn: "MRN-20260514-0001",
			firstName: "Ana",
			middleName: null,
			lastName: "Santos",
			dateOfBirth: "1980-01-01",
			sex: "female",
			isActive: true,
		}

		;(service as unknown as { buildPatientSummaryPayload: jest.Mock }).buildPatientSummaryPayload =
			jest.fn().mockRejectedValue(new Error("boom"))

		;(db.select as jest.Mock)
			.mockReturnValueOnce(selectLimitRows([{ enableOfflineSummaryCache: true }]))
			.mockReturnValueOnce(selectOrderedRows([patient]))
		;(db.insert as jest.Mock).mockReturnValueOnce(insertJob())
		;(db.update as jest.Mock).mockReturnValue(updateJob())

		const result = await service.runJobForFacility(
			"550e8400-e29b-41d4-a716-446655440000",
			"scheduler"
		)

		expect(result.status).toBe("failed")
		expect(result.errorMessage).toBe("boom")
		expect(db.update).toHaveBeenCalledTimes(1)
	})
})
