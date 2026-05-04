import { and, ilike, or } from "drizzle-orm"

import { db } from "@/common/database/database.client"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { ChartAccessService } from "@/modules/v1/audit/chart-access.service"

import { PatientsService } from "./patients.service"

jest.mock("@/utils/sla-step-target", () => ({
	resolveStepTarget: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		selectDistinct: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => {
	const createTable = () =>
		new Proxy(
			{},
			{
				get: (_target, property) => String(property),
			}
		)

	return {
		encounterStatusEvents: createTable(),
		encounters: createTable(),
		opdTriageIntakes: createTable(),
		patients: createTable(),
		staffProfiles: createTable(),
		users: createTable(),
	}
})

jest.mock("drizzle-orm", () => {
	const eq = jest.fn((column: unknown, value: unknown) => ({ type: "eq", column, value }))
	const ilike = jest.fn((column: unknown, value: unknown) => ({ type: "ilike", column, value }))
	const or = jest.fn((...conditions: unknown[]) => ({ type: "or", conditions }))
	const and = jest.fn((...conditions: unknown[]) => ({ type: "and", conditions }))
	const count = jest.fn(() => ({ type: "count" }))
	const desc = jest.fn((column: unknown) => ({ type: "desc", column }))
	const inArray = jest.fn((column: unknown, values: unknown) => ({
		type: "inArray",
		column,
		values,
	}))
	const gte = jest.fn((column: unknown, value: unknown) => ({ type: "gte", column, value }))
	const lt = jest.fn((column: unknown, value: unknown) => ({ type: "lt", column, value }))
	const max = jest.fn((column: unknown) => ({ type: "max", column }))

	function sql(strings: TemplateStringsArray, ...values: unknown[]) {
		return {
			type: "sql",
			strings: Array.from(strings),
			values,
			as(alias: string) {
				return {
					type: "sql",
					alias,
					patientId: `${alias}.patientId`,
					lastEncounterDate: `${alias}.lastEncounterDate`,
				}
			},
		}
	}

	return { and, count, desc, eq, gte, ilike, inArray, lt, max, or, sql }
})

type MockDb = {
	select: jest.Mock
	selectDistinct: jest.Mock
	insert: jest.Mock
	update: jest.Mock
	transaction: jest.Mock
}

function createSubqueryBuilder() {
	return {
		from: jest.fn().mockReturnThis(),
		groupBy: jest.fn().mockReturnThis(),
		as: jest.fn().mockReturnValue({
			patientId: "last_enc.patientId",
			lastEncounterDate: "last_enc.lastEncounterDate",
		}),
	}
}

function createListBuilder(result: unknown) {
	return {
		from: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		offset: jest.fn().mockResolvedValue(result),
	}
}

function createCountBuilder(result: unknown) {
	return {
		from: jest.fn().mockReturnThis(),
		where: jest.fn().mockResolvedValue(result),
	}
}

describe("PatientsService", () => {
	let service: PatientsService
	let mockDb: MockDb

	beforeEach(() => {
		jest.clearAllMocks()
		mockDb = db as unknown as MockDb
		service = new PatientsService(
			{
				resolveStaffProfileId: jest.fn(),
				log: jest.fn(),
			} as unknown as AuditService,
			{
				ensurePatientChartReadAccess: jest.fn(),
			} as unknown as ChartAccessService
		)
	})

	it("matches each search token across first, middle, last name, and MRN fields", async () => {
		mockDb.select
			.mockImplementationOnce(() => createSubqueryBuilder())
			.mockImplementationOnce(() => createListBuilder([]))
			.mockImplementationOnce(() => createCountBuilder([{ count: 0 }]))

		await service.search({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			search: "juan paolo",
			page: 1,
			limit: 50,
			isActive: true,
		})

		expect(or).toHaveBeenCalledTimes(2)
		expect(ilike).toHaveBeenCalledWith("firstName", "%juan%")
		expect(ilike).toHaveBeenCalledWith("middleName", "%juan%")
		expect(ilike).toHaveBeenCalledWith("lastName", "%juan%")
		expect(ilike).toHaveBeenCalledWith("mrn", "%juan%")
		expect(ilike).toHaveBeenCalledWith("firstName", "%paolo%")
		expect(ilike).toHaveBeenCalledWith("middleName", "%paolo%")
		expect(ilike).toHaveBeenCalledWith("lastName", "%paolo%")
		expect(ilike).toHaveBeenCalledWith("mrn", "%paolo%")

		const tokenAndCall = (and as jest.Mock).mock.calls.find(
			call =>
				call.length === 2 &&
				call.every((condition: unknown) => (condition as { type?: string }).type === "or")
		)

		expect(tokenAndCall).toBeDefined()
	})
})
