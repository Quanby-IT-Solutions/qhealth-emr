import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { ProblemsAllergiesService } from "./problems-allergies.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
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
		allergies: createTable(),
		drugGenerics: createTable(),
		icd10Codes: createTable(),
		patients: createTable(),
		problems: createTable(),
		snomedCtCodes: createTable(),
		staffProfiles: createTable(),
		users: createTable(),
	}
})

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
	delete: jest.Mock
}

type SelectBuilderOptions = {
	resolveOnWhere?: boolean
}

function createSelectBuilder(result: unknown, options?: SelectBuilderOptions) {
	const builder = {
		from: jest.fn().mockReturnThis(),
		innerJoin: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		limit: jest.fn().mockResolvedValue(result),
		offset: jest.fn().mockResolvedValue(result),
		as: jest.fn().mockReturnValue({ id: "alias.id", name: "alias.name" }),
		where: jest
			.fn()
			.mockImplementation(() => (options?.resolveOnWhere ? Promise.resolve(result) : builder)),
	}

	return builder
}

function buildAllergy(overrides: Partial<Record<string, unknown>> = {}) {
	const now = new Date("2026-05-15T00:00:00.000Z")

	return {
		id: "550e8400-e29b-41d4-a716-446655440010",
		facilityId: "550e8400-e29b-41d4-a716-446655440000",
		patientId: "550e8400-e29b-41d4-a716-446655440001",
		allergenName: "Penicillin",
		allergenType: "medication",
		reactionType: "Anaphylaxis",
		severity: "severe",
		onsetDate: null,
		isActive: true,
		isVerified: false,
		verifiedAt: null,
		verifiedByStaffId: null,
		verifiedByStaffName: null,
		documentingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		documentingStaffName: "Dr. Test",
		createdAt: now,
		updatedAt: now,
		...overrides,
	}
}

describe("ProblemsAllergiesService", () => {
	let mockDb: MockDb
	let service: ProblemsAllergiesService
	let auditService: { log: jest.Mock }
	let chartAccessService: { ensurePatientChartReadAccess: jest.Mock }

	beforeEach(() => {
		jest.clearAllMocks()
		mockDb = db as unknown as MockDb
		auditService = { log: jest.fn() }
		chartAccessService = {
			ensurePatientChartReadAccess: jest.fn().mockResolvedValue({ mode: "permission_only" }),
		}
		service = new ProblemsAllergiesService(auditService as never, chartAccessService as never)
	})

	it("rejects allergy creation when the submitted facility does not own the patient", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440002" }])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "550e8400-e29b-41d4-a716-446655440001",
						facilityId: "550e8400-e29b-41d4-a716-446655440099",
					},
				])
			)

		await expect(
			service.createAllergy(
				{
					facilityId: "550e8400-e29b-41d4-a716-446655440000",
					patientId: "550e8400-e29b-41d4-a716-446655440001",
					allergenName: "Penicillin",
					allergenType: "medication",
					reactionType: "Anaphylaxis",
					severity: "severe",
				},
				"user-1"
			)
		).rejects.toThrow("Patient does not belong to the selected facility.")

		expect(mockDb.insert).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("does not allow inactive allergies to be verified for CDS blocking", async () => {
		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([]))
			.mockImplementationOnce(() => createSelectBuilder([]))
			.mockImplementationOnce(() =>
				createSelectBuilder([buildAllergy({ isActive: false })], { resolveOnWhere: true })
			)

		await expect(
			service.verifyAllergy({ id: "550e8400-e29b-41d4-a716-446655440010" }, "user-1")
		).rejects.toBeInstanceOf(BadRequestException)

		expect(mockDb.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})
})
