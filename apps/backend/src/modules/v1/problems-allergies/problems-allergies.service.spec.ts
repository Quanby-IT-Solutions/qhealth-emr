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

function createMutationBuilder(result: unknown = []) {
	return {
		values: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockResolvedValue(result),
		returning: jest.fn().mockResolvedValue(result),
	}
}

function buildProblem(overrides: Partial<Record<string, unknown>> = {}) {
	const now = new Date("2026-05-15T00:00:00.000Z")

	return {
		id: "550e8400-e29b-41d4-a716-446655440020",
		facilityId: "550e8400-e29b-41d4-a716-446655440000",
		patientId: "550e8400-e29b-41d4-a716-446655440001",
		icd10Code: "I10",
		icd10Display: "Essential (primary) hypertension",
		snomedCode: null,
		snomedDisplay: null,
		description: "Hypertension",
		onsetDate: "2026-01-01",
		resolutionDate: null,
		status: "active",
		documentingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		documentingStaffName: "Dr. Test",
		createdAt: now,
		updatedAt: now,
		...overrides,
	}
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

	it("rejects duplicate active allergies with the same allergen and type for the same patient", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440002" }])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "550e8400-e29b-41d4-a716-446655440001",
						facilityId: "550e8400-e29b-41d4-a716-446655440000",
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440099" }])
			)

		await expect(
			service.createAllergy(
				{
					facilityId: "550e8400-e29b-41d4-a716-446655440000",
					patientId: "550e8400-e29b-41d4-a716-446655440001",
					allergenName: "penicillin",
					allergenType: "medication",
					reactionType: "Rash",
					severity: "moderate",
				},
				"user-1"
			)
		).rejects.toThrow("This allergy is already active for this patient.")

		expect(mockDb.insert).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("marks problems as entered in error instead of deleting clinical history", async () => {
		const problem = buildProblem()
		const updatedProblem = buildProblem({
			status: "entered_in_error",
			resolutionDate: "2026-05-21",
		})
		const updateBuilder = createMutationBuilder()
		const actor = { userId: "user-1", facilityId: problem.facilityId }

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([problem], { resolveOnWhere: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440002" }])
			)
			.mockImplementationOnce(() => createSelectBuilder([updatedProblem], { resolveOnWhere: true }))
		mockDb.update.mockReturnValue(updateBuilder)

		const result = await service.deleteProblem(problem.id, "user-1", actor as never)

		expect(result.status).toBe("entered_in_error")
		expect(mockDb.delete).not.toHaveBeenCalled()
		expect(mockDb.update).toHaveBeenCalledTimes(1)
		expect(updateBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({ status: "entered_in_error" })
		)
		expect(chartAccessService.ensurePatientChartReadAccess).toHaveBeenCalledWith(
			actor,
			problem.patientId,
			expect.objectContaining({ entityType: "problem", entityId: problem.id })
		)
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "update",
				entityType: "problem",
				entityId: problem.id,
				afterState: expect.objectContaining({ status: "entered_in_error" }),
				metadata: expect.objectContaining({
					previousStatus: "active",
					status: "entered_in_error",
				}),
			})
		)
	})

	it("returns an existing entered-in-error problem without another update", async () => {
		const problem = buildProblem({ status: "entered_in_error" })

		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([problem], { resolveOnWhere: true })
		)

		const result = await service.deleteProblem(problem.id, "user-1")

		expect(result).toEqual(problem)
		expect(mockDb.update).not.toHaveBeenCalled()
		expect(mockDb.delete).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("rejects edits to entered-in-error problems", async () => {
		const problem = buildProblem({ status: "entered_in_error" })

		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([problem], { resolveOnWhere: true })
		)

		await expect(
			service.updateProblem(
				{
					id: problem.id,
					status: "active",
				},
				"user-1"
			)
		).rejects.toThrow("Entered-in-error problems are audit records and cannot be edited.")

		expect(mockDb.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("rejects resolving entered-in-error problems", async () => {
		const problem = buildProblem({ status: "entered_in_error" })

		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([problem], { resolveOnWhere: true })
		)

		await expect(service.resolveProblem({ id: problem.id }, "user-1")).rejects.toThrow(
			"Entered-in-error problems are audit records and cannot be resolved."
		)

		expect(mockDb.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("rejects duplicate active problems with the same ICD-10 code for the same patient", async () => {
		const actor = {
			userId: "user-1",
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
		}

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440002" }])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "550e8400-e29b-41d4-a716-446655440001",
						facilityId: "550e8400-e29b-41d4-a716-446655440000",
					},
				])
			)
			.mockImplementationOnce(() => createSelectBuilder([{ code: "E78.5" }]))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440099" }])
			)

		await expect(
			service.createProblem(
				{
					facilityId: "550e8400-e29b-41d4-a716-446655440000",
					patientId: "550e8400-e29b-41d4-a716-446655440001",
					icd10Code: "E78.5",
					icd10Display: "Dyslipidemia, unspecified",
					description: "Dyslipidemia, unspecified",
					status: "active",
				},
				"user-1",
				actor as never
			)
		).rejects.toThrow("This problem is already active for this patient.")

		expect(mockDb.insert).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("creates a text-only custom diagnosis without ICD-10 or SNOMED codes", async () => {
		const actor = {
			userId: "user-1",
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
		}
		const createdProblem = buildProblem({
			icd10Code: null,
			icd10Display: null,
			snomedCode: null,
			snomedDisplay: null,
			description: "Clinical diagnosis pending coding review",
		})
		const insertBuilder = createMutationBuilder([{ id: createdProblem.id }])

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "550e8400-e29b-41d4-a716-446655440002" }])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "550e8400-e29b-41d4-a716-446655440001",
						facilityId: "550e8400-e29b-41d4-a716-446655440000",
					},
				])
			)
			.mockImplementationOnce(() => createSelectBuilder([createdProblem], { resolveOnWhere: true }))
		mockDb.insert.mockReturnValue(insertBuilder)

		const result = await service.createProblem(
			{
				facilityId: "550e8400-e29b-41d4-a716-446655440000",
				patientId: "550e8400-e29b-41d4-a716-446655440001",
				description: "Clinical diagnosis pending coding review",
				status: "active",
			},
			"user-1",
			actor as never
		)

		expect(insertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				icd10Code: null,
				icd10Display: null,
				snomedCode: null,
				snomedDisplay: null,
				description: "Clinical diagnosis pending coding review",
			})
		)
		expect(result).toEqual(createdProblem)
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "problem",
				afterState: expect.objectContaining({
					icd10Code: null,
					snomedCode: null,
					description: "Clinical diagnosis pending coding review",
				}),
			})
		)
	})
})
