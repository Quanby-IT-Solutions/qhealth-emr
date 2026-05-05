import { BadRequestException, ForbiddenException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { SurgicalService } from "./surgical.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
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
		anesthesiaRecords: createTable(),
		operationRecords: createTable(),
		patients: createTable(),
		rvsCodes: createTable(),
		staffProfiles: createTable(),
		surgicalCases: createTable(),
		surgicalChecklists: createTable(),
		surgicalRvsAssignments: createTable(),
		users: createTable(),
	}
})

jest.mock("drizzle-orm", () => {
	const and = jest.fn((...conditions: unknown[]) => ({ type: "and", conditions }))
	const count = jest.fn(() => ({ type: "count" }))
	const desc = jest.fn((column: unknown) => ({ type: "desc", column }))
	const eq = jest.fn((column: unknown, value: unknown) => ({ type: "eq", column, value }))
	const gte = jest.fn((column: unknown, value: unknown) => ({ type: "gte", column, value }))
	const ilike = jest.fn((column: unknown, value: unknown) => ({ type: "ilike", column, value }))
	const lt = jest.fn((column: unknown, value: unknown) => ({ type: "lt", column, value }))
	const or = jest.fn((...conditions: unknown[]) => ({ type: "or", conditions }))

	function sql(strings: TemplateStringsArray, ...values: unknown[]) {
		return {
			type: "sql",
			strings: Array.from(strings),
			values,
			as(alias: string) {
				return {
					type: "sql",
					alias,
					id: `${alias}.id`,
					name: `${alias}.name`,
				}
			},
		}
	}

	return { and, count, desc, eq, gte, ilike, lt, or, sql }
})

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
}

function createSelectBuilder(result: unknown) {
	return {
		from: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		limit: jest.fn().mockResolvedValue(result),
		leftJoin: jest.fn().mockReturnThis(),
		innerJoin: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		offset: jest.fn().mockResolvedValue(result),
	}
}

function createUpdateBuilder() {
	const where = jest.fn().mockResolvedValue(undefined)
	const set = jest.fn().mockReturnValue({ where })

	return { set, where }
}

describe("SurgicalService", () => {
	let service: SurgicalService
	let mockDb: MockDb

	beforeEach(() => {
		jest.clearAllMocks()
		service = new SurgicalService()
		mockDb = db as unknown as MockDb
	})

	it("rejects saving a signed operation record", async () => {
		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([
				{
					facilityId: "facility-1",
					encounterId: "encounter-1",
					anesthesiologistStaffId: "anes-1",
				},
			])
		)
		jest.spyOn(service as any, "getOperationRecordRow").mockResolvedValue({
			id: "op-1",
			status: "signed",
		} as any)

		await expect(
			service.saveOperationRecord(
				{
					caseId: "case-1",
					surgeonStaffId: "surgeon-1",
					preOpDiagnosis: "Acute appendicitis",
					procedurePerformed: "Appendectomy",
					instrumentCountCorrect: true,
					swabCountCorrect: true,
				},
				{ user: { id: "user-1" } } as any
			)
		).rejects.toThrow(BadRequestException)
	})

	it("allows only the assigned surgeon to sign an operation record", async () => {
		jest.spyOn(service as any, "getOperationRecordRow").mockResolvedValue({
			id: "op-1",
			status: "draft",
			preOpDiagnosis: "Acute appendicitis",
			procedurePerformed: "Appendectomy",
			procedureDescription: "Laparoscopic appendectomy with irrigation",
			operativeTechnique: "Appendix isolated and transected.",
			incisionTime: new Date("2026-05-05T00:00:00.000Z"),
			closureTime: new Date("2026-05-05T01:00:00.000Z"),
			scrubNurseStaffId: "scrub-1",
			circulatingNurseStaffId: "circ-1",
			anesthesiologistStaffId: "anes-1",
			surgeonStaffId: "surgeon-1",
		} as any)

		await expect(service.signOperationRecord({ caseId: "case-1" }, "surgeon-2")).rejects.toThrow(
			ForbiddenException
		)
	})

	it("rejects signing when the required operative charting fields are incomplete", async () => {
		jest.spyOn(service as any, "getOperationRecordRow").mockResolvedValue({
			id: "op-1",
			status: "draft",
			preOpDiagnosis: "Acute appendicitis",
			procedurePerformed: "Appendectomy",
			procedureDescription: null,
			operativeTechnique: null,
			incisionTime: null,
			closureTime: null,
			scrubNurseStaffId: null,
			circulatingNurseStaffId: null,
			anesthesiologistStaffId: null,
			surgeonStaffId: "surgeon-1",
		} as any)

		await expect(service.signOperationRecord({ caseId: "case-1" }, "surgeon-1")).rejects.toThrow(
			BadRequestException
		)

		expect(mockDb.update).not.toHaveBeenCalled()
	})

	it("signs a draft operation record and stamps signer metadata", async () => {
		const updateBuilder = createUpdateBuilder()

		jest.spyOn(service as any, "getOperationRecordRow").mockResolvedValue({
			id: "op-1",
			status: "draft",
			preOpDiagnosis: "Acute appendicitis",
			procedurePerformed: "Appendectomy",
			procedureDescription: "Laparoscopic appendectomy with irrigation",
			operativeTechnique: "Appendix isolated and transected.",
			incisionTime: new Date("2026-05-05T00:00:00.000Z"),
			closureTime: new Date("2026-05-05T01:00:00.000Z"),
			scrubNurseStaffId: "scrub-1",
			circulatingNurseStaffId: "circ-1",
			anesthesiologistStaffId: "anes-1",
			surgeonStaffId: "surgeon-1",
		} as any)
		jest.spyOn(service as any, "getOperationRecord").mockResolvedValue({
			id: "op-1",
			surgicalCaseId: "case-1",
			preOpDiagnosis: "Acute appendicitis",
			postOpDiagnosis: null,
			procedurePerformed: "Appendectomy",
			procedureDescription: "Laparoscopic appendectomy with irrigation",
			operativeTechnique: "Appendix isolated and transected.",
			findings: null,
			specimens: null,
			estimatedBloodLoss: null,
			fluidIn: null,
			fluidOut: null,
			incisionDatetime: "2026-05-05T00:00:00.000Z",
			closureDatetime: "2026-05-05T01:00:00.000Z",
			surgeonStaffId: "surgeon-1",
			firstAssistantStaffId: null,
			secondAssistantStaffId: null,
			scrubNurseStaffId: "scrub-1",
			circulatingNurseStaffId: "circ-1",
			anesthesiologistStaffId: "anes-1",
			instrumentCountCorrect: true,
			swabCountCorrect: true,
			complications: null,
			status: "signed",
			signedAt: "2026-05-05T00:00:00.000Z",
			signedByStaffId: "surgeon-1",
			signedByName: "Dr. Surgeon",
			createdAt: new Date("2026-05-05T00:00:00.000Z"),
			updatedAt: new Date("2026-05-05T00:00:00.000Z"),
		} as any)
		mockDb.update.mockReturnValue(updateBuilder)

		const result = await service.signOperationRecord({ caseId: "case-1" }, "surgeon-1")

		expect(updateBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "signed",
				signedByStaffId: "surgeon-1",
				signedAt: expect.any(Date),
				updatedAt: expect.any(Date),
			})
		)
		expect(result).toEqual(
			expect.objectContaining({
				status: "signed",
				signedByStaffId: "surgeon-1",
			})
		)
	})

	it("stores operationRecordId when suggesting an RVS code after signing", async () => {
		const values = jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue([{ id: "assignment-1" }]),
		})

		jest.spyOn(service as any, "requireSignedOperationRecord").mockResolvedValue({
			id: "op-1",
			status: "signed",
			procedurePerformed: "Laparoscopic cholecystectomy",
		} as any)
		jest.spyOn(service as any, "queryRvsAssignments").mockResolvedValue([])
		jest.spyOn(service as any, "queryRvsAssignmentById").mockResolvedValue({
			id: "assignment-1",
		} as any)
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ rvsCode: "47562", procedureName: "Laparoscopic cholecystectomy" }])
			)
			.mockImplementationOnce(() => createSelectBuilder([{ facilityId: "facility-1" }]))
		mockDb.insert.mockReturnValue({ values })

		await service.suggestRvsCode(
			{
				caseId: "case-1",
				rvsCodeId: "rvs-1",
				procedureLabel: "Laparoscopic cholecystectomy",
				assignmentType: "primary",
				units: 1,
			},
			"staff-1"
		)

		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({
				surgicalCaseId: "case-1",
				operationRecordId: "op-1",
				rvsCodeId: "rvs-1",
				procedureLabel: "Laparoscopic cholecystectomy",
				assignmentType: "primary",
				suggestedByStaffId: "staff-1",
			})
		)
	})

	it("requires billing sign permission to finalize an RVS assignment", async () => {
		jest.spyOn(service as any, "requireSignedOperationRecord").mockResolvedValue({
			id: "op-1",
			status: "signed",
		} as any)
		jest.spyOn(service as any, "queryRvsAssignmentById").mockResolvedValue({
			id: "assignment-1",
		} as any)

		await expect(
			service.updateRvsStatus(
				{
					caseId: "case-1",
					assignmentId: "assignment-1",
					status: "finalized",
				},
				{
					staffProfileId: "staff-1",
					canEditBilling: true,
					canSignBilling: false,
				}
			)
		).rejects.toThrow(ForbiddenException)

		expect(mockDb.update).not.toHaveBeenCalled()
	})
})
