import { type AuditService } from "@/modules/v1/audit/audit.service"
import { type ChartAccessService } from "@/modules/v1/audit/chart-access.service"

import { PatientsService } from "./patients.service"

jest.mock("@/utils/sla-step-target", () => ({
	resolveStepTarget: jest.fn().mockResolvedValue(null),
}))

// `database.client` imports the ESM-only `@t3-oss/env-core` through `env.config`,
// which Jest cannot transform. The Drizzle path is unused by `search`, so a stub
// keeps module loading side-effect free.
jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		selectDistinct: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		transaction: jest.fn(),
	},
}))

// `search` was migrated to the Supabase JS client. Mocking the client avoids the
// real (ESM) env/config chain and lets us assert on the query builder.
jest.mock("@/common/database/supabase.client", () => ({
	supabase: { from: jest.fn() },
	unwrapMany: (result: { data: unknown[] | null; error: { message: string } | null }) => {
		if (result.error) throw new Error(result.error.message)
		return result.data ?? []
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

import { supabase } from "@/common/database/supabase.client"

const SUPABASE_METHODS = [
	"select",
	"eq",
	"or",
	"ilike",
	"in",
	"order",
	"range",
	"gte",
	"lt",
] as const

type QueryBuilder = Record<(typeof SUPABASE_METHODS)[number], jest.Mock> & {
	then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
}

/**
 * Build a chainable, thenable stub for the Supabase query builder. Every chained
 * method returns the same builder, and awaiting it resolves to `result` (the
 * shape returned by PostgREST: `{ data, count, error }`).
 */
function createQueryBuilder(result: unknown): QueryBuilder {
	const builder = {} as QueryBuilder
	for (const method of SUPABASE_METHODS) {
		builder[method] = jest.fn(() => builder)
	}
	builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
	return builder
}

const fromMock = supabase.from as jest.Mock

/** Queue the builders returned by successive `supabase.from(...)` calls, in order. */
function queueBuilders(...builders: QueryBuilder[]) {
	let index = 0
	fromMock.mockImplementation(
		() => builders[index++] ?? createQueryBuilder({ data: [], count: 0, error: null })
	)
}

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("PatientsService", () => {
	let service: PatientsService

	beforeEach(() => {
		jest.clearAllMocks()
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

	it("builds an OR ilike filter across name and MRN fields for each search token", async () => {
		const scoped = createQueryBuilder({ data: [], count: 0, error: null })
		const unscoped = createQueryBuilder({ data: [], count: 0, error: null })
		queueBuilders(scoped, unscoped)

		await service.search({
			facilityId: FACILITY_ID,
			search: "juan paolo",
			page: 1,
			limit: 50,
			isActive: true,
		})

		expect(scoped.eq).toHaveBeenCalledWith("is_active", true)
		expect(scoped.eq).toHaveBeenCalledWith("facility_id", FACILITY_ID)
		expect(scoped.or).toHaveBeenCalledWith(
			"first_name.ilike.%juan%,middle_name.ilike.%juan%,last_name.ilike.%juan%,mrn.ilike.%juan%"
		)
		expect(scoped.or).toHaveBeenCalledWith(
			"first_name.ilike.%paolo%,middle_name.ilike.%paolo%,last_name.ilike.%paolo%,mrn.ilike.%paolo%"
		)
	})

	it("falls back to a facility-unscoped query when an identifier search returns no rows", async () => {
		const scoped = createQueryBuilder({ data: [], count: 0, error: null })
		const unscoped = createQueryBuilder({
			data: [
				{
					id: FACILITY_ID,
					mrn: "MRN-20260504-0001",
					first_name: "Juan",
					last_name: "Dela Cruz",
					middle_name: null,
					date_of_birth: "1985-01-15",
					sex: "male",
					philhealth_member_id: null,
					is_active: true,
				},
			],
			count: 1,
			error: null,
		})
		const encounters = createQueryBuilder({ data: [], error: null })
		queueBuilders(scoped, unscoped, encounters)

		const result = await service.search({
			facilityId: FACILITY_ID,
			mrn: "MRN-20260504-0001",
			page: 1,
			limit: 50,
			isActive: true,
		})

		// patients (scoped), patients (unscoped fallback), encounters (last-visit lookup)
		expect(fromMock).toHaveBeenCalledTimes(3)
		expect(scoped.eq).toHaveBeenCalledWith("facility_id", FACILITY_ID)
		expect(unscoped.eq).not.toHaveBeenCalledWith("facility_id", FACILITY_ID)
		expect(result.total).toBe(1)
	})

	it("serializes patient date of birth values as YYYY-MM-DD strings in search results", async () => {
		const patientId = "550e8400-e29b-41d4-a716-446655440001"
		const patientsBuilder = createQueryBuilder({
			data: [
				{
					id: patientId,
					mrn: "MRN-20260504-0001",
					first_name: "Juan",
					last_name: "Dela Cruz",
					middle_name: null,
					date_of_birth: new Date(1985, 0, 15),
					sex: "male",
					philhealth_member_id: null,
					is_active: true,
				},
			],
			count: 1,
			error: null,
		})
		const encountersBuilder = createQueryBuilder({
			data: [{ patient_id: patientId, admission_datetime: "2026-05-04T00:00:00.000Z" }],
			error: null,
		})
		queueBuilders(patientsBuilder, encountersBuilder)

		const result = await service.search({
			facilityId: FACILITY_ID,
			page: 1,
			limit: 50,
			isActive: true,
		})

		expect(result.data[0]?.dateOfBirth).toBe("1985-01-15")
		expect(result.data[0]?.lastEncounterDate).toBe("2026-05-04T00:00:00.000Z")
		expect(result.total).toBe(1)
	})
})
