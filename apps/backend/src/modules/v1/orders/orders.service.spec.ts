import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { type ProblemsAllergiesService } from "../problems-allergies/problems-allergies.service"
import { OrdersService } from "./orders.service"

// Bypass the @repo/contracts barrel (which transitively loads @orpc/contract
// as ESM) — these tests don't use any contract objects at runtime.
jest.mock("@repo/contracts", () => ({
	SLA_STEP_DEFAULT_TARGETS: {},
}))

// resolveStepTarget queries slaStepConfigs which is outside the scope of
// these orders.service tests. Stub it to a no-op.
jest.mock("@/utils/sla-step-target", () => ({
	resolveStepTarget: jest.fn().mockResolvedValue(null),
}))

// closeOpenSlaStep queries encounterStatusEvents which is outside the scope
// of these orders.service tests. Stub it to a no-op.
jest.mock("@/utils/sla-events", () => ({
	closeOpenSlaStep: jest.fn().mockResolvedValue(undefined),
}))

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
		auditLogs: createTable(),
		counselingLogs: createTable(),
		dispenseLogs: createTable(),
		drugBrands: createTable(),
		drugGenerics: createTable(),
		encounters: createTable(),
		encounterStatusEvents: createTable(),
		formularyItems: createTable(),
		highAlertVerifications: createTable(),
		icd10Codes: createTable(),
		imagingOrders: createTable(),
		labOrders: createTable(),
		loincCodes: createTable(),
		marEntries: createTable(),
		medicationOrders: createTable(),
		orderVerifications: createTable(),
		patients: createTable(),
		preEncounters: createTable(),
		prescriptions: createTable(),
		slaStepConfigs: createTable(),
		staffProfiles: createTable(),
		users: createTable(),
	}
})

type SelectBuilderOptions = {
	withOrderBy?: boolean
	withPagination?: boolean
	withLimit?: boolean
}

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
}

function createSelectBuilder(result: unknown, options?: SelectBuilderOptions) {
	const builder = {
		from: jest.fn().mockReturnThis(),
		innerJoin: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		where: jest
			.fn()
			.mockImplementation(() =>
				options?.withOrderBy || options?.withPagination || options?.withLimit
					? builder
					: Promise.resolve(result)
			),
	}

	if (options?.withOrderBy) {
		Object.assign(builder, {
			orderBy: jest.fn().mockReturnThis(),
		})
	}

	if (options?.withPagination) {
		Object.assign(builder, {
			limit: jest.fn().mockReturnThis(),
			offset: jest.fn().mockResolvedValue(result),
		})
	}

	if (options?.withLimit) {
		Object.assign(builder, {
			limit: jest.fn().mockResolvedValue(result),
		})
	}

	return builder
}

function createInsertBuilder(result: unknown) {
	return {
		values: jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue(result),
			onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

function createUpdateBuilder() {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
		}),
	}
}

describe("OrdersService", () => {
	let service: OrdersService
	let mockDb: MockDb
	let problemsAllergiesMock: { getActiveAllergies: jest.Mock }

	beforeEach(() => {
		jest.clearAllMocks()
		mockDb = db as unknown as MockDb
		problemsAllergiesMock = {
			getActiveAllergies: jest.fn(),
		}
		service = new OrdersService(problemsAllergiesMock as unknown as ProblemsAllergiesService)
	})

	it("enriches the verification queue with patient context and alert counts", async () => {
		const createdAt = new Date("2025-04-16T10:00:00.000Z")

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([{ count: 1 }]))
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "order-1",
							facilityId: "facility-1",
							encounterId: "encounter-1",
							preEncounterId: null,
							formularyItemId: null,
							genericName: "Amoxicillin",
							brandName: null,
							rxnormCode: null,
							dose: "500",
							doseUnit: "mg",
							doseForm: "capsule",
							route: "PO",
							frequency: "TID",
							durationDays: 7,
							specialInstructions: null,
							isPrn: false,
							prnReason: null,
							isControlledSubstance: false,
							pdeaSchedule: null,
							pdeaTrancheNumber: null,
							pdeaTrancheTotal: null,
							parentOrderId: null,
							status: "pending_verification",
							orderingStaffId: "staff-1",
							orderingStaffName: "Dr. Santos",
							patientId: "patient-1",
							patientFirstName: "Juan",
							patientLastName: "Dela Cruz",
							patientMrn: "MRN-001",
							patientDateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
							cdsAlerts: [
								{
									type: "allergy_hard_block",
									severity: "hard_block",
									message: "Severe allergy conflict",
								},
								{
									type: "formulary_warning",
									severity: "warning",
									message: "Off formulary",
								},
							],
							cdsOverrides: null,
							createdAt,
							updatedAt: createdAt,
						},
					],
					{ withOrderBy: true, withPagination: true }
				)
			)

		const result = await service.getVerificationQueue({
			facilityId: "facility-1",
			page: 1,
			limit: 50,
		})

		expect(result.total).toBe(1)
		expect(result.data).toEqual([
			expect.objectContaining({
				id: "order-1",
				patientName: "Dela Cruz, Juan",
				patientMrn: "MRN-001",
				priority: "routine",
				alertCount: 2,
				criticalAlertCount: 1,
				receivedAt: createdAt,
			}),
		])
	})

	it("maps pharmacy order detail safety checks from CDS alerts", async () => {
		const createdAt = new Date("2025-04-16T09:30:00.000Z")

		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([
				{
					id: "order-2",
					facilityId: "facility-1",
					encounterId: "encounter-2",
					preEncounterId: null,
					formularyItemId: null,
					genericName: "Warfarin",
					brandName: null,
					rxnormCode: null,
					dose: "5",
					doseUnit: "mg",
					doseForm: "tablet",
					route: "PO",
					frequency: "OD",
					durationDays: 30,
					specialInstructions: null,
					isPrn: false,
					prnReason: null,
					isControlledSubstance: false,
					pdeaSchedule: null,
					pdeaTrancheNumber: null,
					pdeaTrancheTotal: null,
					parentOrderId: null,
					status: "pending_verification",
					orderingStaffId: "staff-1",
					orderingStaffName: "Dr. Santos",
					patientId: "patient-2",
					patientFirstName: "Maria",
					patientLastName: "Reyes",
					patientMrn: "MRN-002",
					patientDateOfBirth: new Date("1985-02-14T00:00:00.000Z"),
					cdsAlerts: {
						alerts: [
							{
								type: "high_alert",
								severity: "warning",
								message: "High-alert medication",
								details: { highAlertNotes: "Double verification required" },
							},
							{
								type: "allergy_soft_block",
								severity: "soft_block",
								message: "Override required",
							},
						],
						pdeaDispenseDate: "2026-06-16",
					},
					cdsOverrides: null,
					createdAt,
					updatedAt: createdAt,
				},
			])
		)

		const result = await service.findMedOrder("order-2")

		expect(result).toEqual(
			expect.objectContaining({
				patientName: "Reyes, Maria",
				alertCount: 2,
				criticalAlertCount: 0,
				safetyChecks: [
					expect.objectContaining({
						type: "black_box_warning",
						severity: "moderate",
						isHardBlock: false,
					}),
					expect.objectContaining({
						type: "allergy_cross_reactivity",
						severity: "major",
						requiresOverride: true,
					}),
				],
			})
		)
	})

	it("creates a pharmacist verification record and activates the order when approved", async () => {
		const pharmacist = { id: "staff-pharm-1", userId: "user-1" }
		const createdAt = new Date("2025-04-16T09:30:00.000Z")
		const verificationCreatedAt = new Date("2025-04-16T10:05:00.000Z")

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([pharmacist]))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "order-3",
						facilityId: "facility-1",
						encounterId: "encounter-3",
						preEncounterId: null,
						formularyItemId: null,
						genericName: "Metformin",
						brandName: null,
						rxnormCode: null,
						dose: "500",
						doseUnit: "mg",
						doseForm: "tablet",
						route: "PO",
						frequency: "BID",
						durationDays: 30,
						specialInstructions: null,
						isPrn: false,
						prnReason: null,
						isControlledSubstance: false,
						pdeaSchedule: null,
						pdeaTrancheNumber: null,
						pdeaTrancheTotal: null,
						parentOrderId: null,
						status: "pending_verification",
						orderingStaffId: "staff-ord-1",
						orderingStaffName: "Dr. Santos",
						patientId: "patient-3",
						patientFirstName: "Ana",
						patientLastName: "Lopez",
						patientMrn: "MRN-003",
						patientDateOfBirth: new Date("1992-03-20T00:00:00.000Z"),
						cdsAlerts: [],
						cdsOverrides: null,
						createdAt,
						updatedAt: createdAt,
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ encounterType: "inpatient" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "verification-1",
						medicationOrderId: "order-3",
						action: "approved",
						pharmacistStaffId: "staff-pharm-1",
						pharmacistStaffName: "RPh Garcia",
						rejectionReason: null,
						modificationNotes: null,
						verifiedAt: verificationCreatedAt,
						createdAt: verificationCreatedAt,
					},
				])
			)

		mockDb.insert.mockImplementationOnce(() => createInsertBuilder([{ id: "verification-1" }]))
		// Subsequent insert calls (e.g. encounterStatusEvents for SLA tracking)
		// — return a no-op chainable builder.
		mockDb.insert.mockImplementation(() => createInsertBuilder([]))
		mockDb.update.mockImplementationOnce(() => createUpdateBuilder())

		const result = await service.verifyOrder(
			{
				medicationOrderId: "order-3",
				action: "approved",
			},
			"user-1"
		)

		expect(mockDb.insert).toHaveBeenCalled()
		expect(mockDb.update).toHaveBeenCalledTimes(1)
		const updateBuilder = mockDb.update.mock.results[0]?.value as ReturnType<
			typeof createUpdateBuilder
		>
		expect(updateBuilder.set).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }))
		expect(result).toEqual(
			expect.objectContaining({
				id: "verification-1",
				action: "approved",
				pharmacistStaffName: "RPh Garcia",
			})
		)
	})

	it("fails verification when the pharmacist staff profile is missing", async () => {
		mockDb.select.mockImplementationOnce(() => createSelectBuilder([]))

		await expect(
			service.verifyOrder(
				{
					medicationOrderId: "order-404",
					action: "approved",
				},
				"user-missing"
			)
		).rejects.toBeInstanceOf(NotFoundException)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("hard-blocks beta-lactam orders for verified severe penicillin allergies", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({
			allergies: [
				{
					allergenName: "Penicillin",
					allergenType: "medication",
					severity: "severe",
					reactionType: "Anaphylaxis",
					isActive: true,
					isVerified: true,
				},
			],
		})
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ genericName: "Amoxicillin" }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withOrderBy: true, withLimit: true }))

		const result = await service.evaluateCds({
			patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
			facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
			genericName: "Amoxicillin",
			orderingStaffId: "staff-1",
		})

		expect(result.canProceed).toBe(false)
		expect(result.alerts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "allergy_hard_block",
					severity: "hard_block",
					details: expect.objectContaining({
						allergenName: "Penicillin",
						matchType: "class",
						allergyClass: "Penicillin / beta-lactam",
					}),
				}),
			])
		)
	})

	it("does not block orders for unverified allergies even if an upstream feed includes them", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({
			allergies: [
				{
					allergenName: "Penicillin",
					allergenType: "medication",
					severity: "severe",
					reactionType: "Anaphylaxis",
					isActive: true,
					isVerified: false,
				},
			],
		})
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ genericName: "Amoxicillin" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							isActive: true,
							isRestricted: false,
							isHighAlert: false,
						},
					],
					{ withOrderBy: true, withLimit: true }
				)
			)

		const result = await service.evaluateCds({
			patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
			facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
			genericName: "Amoxicillin",
			orderingStaffId: "staff-1",
		})

		expect(result.canProceed).toBe(true)
		expect(result.alerts).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ type: "allergy_hard_block" })])
		)
	})

	it("treats off-formulary generics as a soft block that requires override", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({ allergies: [] })
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ genericName: "Amoxicillin" }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withOrderBy: true, withLimit: true }))

		const result = await service.evaluateCds({
			patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
			facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
			genericName: "Amoxicillin",
			orderingStaffId: "staff-1",
		})

		expect(result.canProceed).toBe(true)
		expect(result.requiresOverride).toBe(true)
		expect(result.alerts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "formulary_warning",
					severity: "soft_block",
					message: "This drug is off-formulary or inactive at this facility.",
				}),
			])
		)
	})

	it("rejects CDS evaluation when the patient is outside the facility", async () => {
		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder(
				[
					{
						id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
						facilityId: "8d79f2a7-70d4-47b6-b8ff-3b944d4eeddd",
					},
				],
				{ withLimit: true }
			)
		)

		await expect(
			service.evaluateCds({
				patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
				facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
				genericName: "Amoxicillin",
				orderingStaffId: "staff-1",
			})
		).rejects.toBeInstanceOf(BadRequestException)
		expect(problemsAllergiesMock.getActiveAllergies).not.toHaveBeenCalled()
	})

	it("rejects CDS evaluation when a brand name is entered as the generic", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							brandName: "Biogesic",
							genericName: "Paracetamol",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.evaluateCds({
				patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
				facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
				genericName: "Biogesic",
				orderingStaffId: "staff-1",
			})
		).rejects.toThrow(
			"Biogesic is a brand name. Select the generic name first (Paracetamol); brand name is optional and subordinate."
		)
		expect(problemsAllergiesMock.getActiveAllergies).not.toHaveBeenCalled()
	})

	it("rejects a brand name entered in the generic-name field", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							brandName: "Biogesic",
							genericName: "Paracetamol",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					genericName: "Biogesic",
					dose: "500",
					doseUnit: "mg",
					doseForm: "tablet",
					route: "PO",
					frequency: "once",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow(
			"Biogesic is a brand name. Select the generic name first (Paracetamol); brand name is optional and subordinate."
		)
		expect(problemsAllergiesMock.getActiveAllergies).not.toHaveBeenCalled()
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("requires a completed CDS check before creating a medication order", async () => {
		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
		)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					formularyItemId: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
					genericName: "Amoxicillin",
					dose: "500",
					doseUnit: "mg",
					doseForm: "capsule",
					route: "PO",
					frequency: "once",
				},
				"user-1"
			)
		).rejects.toThrow("Run the CDS safety check before submitting the medication order.")
	})

	it("rejects medication orders when patientId does not match the selected encounter", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ encounterType: "outpatient" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
							isActive: true,
							genericName: "Amoxicillin",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							patientId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					encounterId: "99999999-9999-4999-9999-999999999999",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					formularyItemId: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
					genericName: "Amoxicillin",
					dose: "500",
					doseUnit: "mg",
					doseForm: "capsule",
					route: "PO",
					frequency: "once",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow("Medication order patientId does not match the selected encounter.")
		expect(problemsAllergiesMock.getActiveAllergies).not.toHaveBeenCalled()
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("rejects duplicate open medication orders for the same encounter", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({ allergies: [] })

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ encounterType: "outpatient" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
							isActive: true,
							genericName: "Amlodipine",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							isActive: true,
							isRestricted: false,
							isHighAlert: false,
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "existing-order",
							status: "active",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					encounterId: "99999999-9999-4999-9999-999999999999",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					formularyItemId: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
					genericName: "Amlodipine",
					dose: "5",
					doseUnit: "mg",
					doseForm: "tablet",
					route: "PO",
					frequency: "once",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow(
			"Amlodipine already has an open medication order for this encounter. Discontinue or update the existing order before creating another one."
		)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("requires override reasons for CDS soft blocks before creating a medication order", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({
			allergies: [
				{
					allergenName: "Amoxicillin",
					allergenType: "medication",
					severity: "moderate",
					reactionType: "rash",
					isActive: true,
					isVerified: true,
				},
			],
		})

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
							isActive: true,
							genericName: "Amoxicillin",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							isActive: true,
							isRestricted: false,
							isHighAlert: false,
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					formularyItemId: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
					genericName: "Amoxicillin",
					dose: "500",
					doseUnit: "mg",
					doseForm: "capsule",
					route: "PO",
					frequency: "once",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow(
			"Provide clinical override justification for each CDS soft block before submitting the medication order."
		)
	})

	it("requires an override reason before creating an off-formulary medication order", async () => {
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({ allergies: [] })

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([{ genericName: "Amoxicillin" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withOrderBy: true, withLimit: true }))

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					genericName: "Amoxicillin",
					dose: "500",
					doseUnit: "mg",
					doseForm: "capsule",
					route: "PO",
					frequency: "once",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow(
			"Provide clinical override justification for each CDS soft block before submitting the medication order."
		)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("persists server-evaluated CDS alerts when creating a medication order", async () => {
		const createdAt = new Date("2025-04-16T12:00:00.000Z")
		problemsAllergiesMock.getActiveAllergies.mockResolvedValue({
			allergies: [
				{
					allergenName: "Amoxicillin",
					allergenType: "medication",
					severity: "moderate",
					reactionType: "rash",
					isActive: true,
					isVerified: true,
				},
			],
		})
		jest.spyOn(service, "findMedOrder").mockResolvedValue({ id: "order-created" } as never)

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "staff-1", userId: "user-1" }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
							isActive: true,
							genericName: "Amoxicillin",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
							facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
							isActive: true,
							isRestricted: false,
							isHighAlert: false,
						},
					],
					{ withLimit: true }
				)
			)

		const insertBuilder = createInsertBuilder([
			{
				id: "order-created",
				createdAt,
				updatedAt: createdAt,
			},
		])
		mockDb.insert.mockImplementationOnce(() => insertBuilder)
		mockDb.insert.mockImplementation(() => createInsertBuilder([]))

		await service.createMedOrder(
			{
				facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
				patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
				formularyItemId: "3f6a0f4f-761d-4fd1-b76f-95e6692eb001",
				genericName: "Amoxicillin",
				dose: "500",
				doseUnit: "mg",
				doseForm: "capsule",
				route: "PO",
				frequency: "once",
				cdsAlerts: [],
				cdsOverrides: {
					overrides: [
						{
							alertId: "allergy-0",
							reason: "Benefit outweighs risk",
							overriddenAt: createdAt.toISOString(),
						},
					],
				},
			},
			"user-1"
		)

		expect(insertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				cdsAlerts: [
					expect.objectContaining({
						type: "allergy_soft_block",
						severity: "soft_block",
						details: expect.objectContaining({
							allergenName: "Amoxicillin",
							reactionType: "rash",
						}),
					}),
				],
				status: "pending_verification",
			})
		)
	})

	it("creates a signed lab order with persisted indication metadata", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const labOrderId = "11111111-1111-4111-8111-111111111111"
		const orderInsertBuilder = createInsertBuilder([{ id: labOrderId }])
		const auditInsertBuilder = createInsertBuilder([])
		const slaInsertBuilder = createInsertBuilder([])

		jest.spyOn(service, "findLabOrder").mockResolvedValue({ id: labOrderId } as never)

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[{ id: "staff-physician", userId: "user-1", facilityId, isActive: true }],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ loincNum: "57021-8" }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([{ code: "J18.9" }], { withLimit: true }))

		mockDb.insert
			.mockImplementationOnce(() => orderInsertBuilder)
			.mockImplementationOnce(() => auditInsertBuilder)
			.mockImplementationOnce(() => slaInsertBuilder)

		const result = await service.createLabOrder(
			{
				facilityId,
				encounterId,
				testName: "Complete Blood Count",
				loincCode: "57021-8",
				clinicalIndication: "Fever and productive cough",
				indicationIcd10Code: "J18.9",
				indicationIcd10Display: "Pneumonia, unspecified organism",
				priority: "stat",
				specimenType: "Blood",
			},
			"user-1"
		)

		expect(orderInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				encounterId,
				testName: "Complete Blood Count",
				loincCode: "57021-8",
				clinicalIndication: "Fever and productive cough",
				indicationIcd10Code: "J18.9",
				indicationIcd10Display: "Pneumonia, unspecified organism",
				priority: "stat",
				status: "ordered",
				orderingStaffId: "staff-physician",
			})
		)
		expect(auditInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				userId: "user-1",
				staffProfileId: "staff-physician",
				action: "sign",
				entityType: "lab_order",
				entityId: labOrderId,
				metadata: expect.objectContaining({
					encounterId,
					indicationIcd10Code: "J18.9",
				}),
			})
		)
		expect(slaInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				encounterId,
				toStatus: "lab_ordered",
				staffId: "staff-physician",
			})
		)
		expect(result).toEqual({ id: labOrderId })
	})

	it("rejects lab order signing without an active LOINC test", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[{ id: "staff-physician", userId: "user-1", facilityId, isActive: true }],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId }], { withLimit: true })
			)

		await expect(
			service.createLabOrder(
				{
					facilityId,
					encounterId,
					testName: "Complete Blood Count",
					clinicalIndication: "Fever and productive cough",
					indicationIcd10Code: "J18.9",
					indicationIcd10Display: "Pneumonia, unspecified organism",
				},
				"user-1"
			)
		).rejects.toThrow("Select an active LOINC lab test")

		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("rejects lab order signing without an active ICD-10 indication", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[{ id: "staff-physician", userId: "user-1", facilityId, isActive: true }],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ loincNum: "57021-8" }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))

		await expect(
			service.createLabOrder(
				{
					facilityId,
					encounterId,
					testName: "Complete Blood Count",
					loincCode: "57021-8",
					clinicalIndication: "Fever and productive cough",
					indicationIcd10Code: "BAD.1",
					indicationIcd10Display: "Bad diagnosis",
				},
				"user-1"
			)
		).rejects.toThrow("Select a valid active ICD-10 indication")

		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("creates a signed imaging order with persisted indication metadata", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const imagingOrderId = "22222222-2222-4222-8222-222222222222"
		const orderInsertBuilder = createInsertBuilder([{ id: imagingOrderId }])
		const auditInsertBuilder = createInsertBuilder([])
		const slaInsertBuilder = createInsertBuilder([])

		jest.spyOn(service, "findImagingOrder").mockResolvedValue({ id: imagingOrderId } as never)

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[{ id: "staff-physician", userId: "user-1", facilityId, isActive: true }],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId }], { withLimit: true })
			)
			.mockImplementationOnce(() => createSelectBuilder([{ code: "J18.9" }], { withLimit: true }))

		mockDb.insert
			.mockImplementationOnce(() => orderInsertBuilder)
			.mockImplementationOnce(() => auditInsertBuilder)
			.mockImplementationOnce(() => slaInsertBuilder)

		const result = await service.createImagingOrder(
			{
				facilityId,
				encounterId,
				modality: "xray",
				bodyPart: "Chest",
				clinicalIndication: "Fever and productive cough",
				indicationIcd10Code: "J18.9",
				indicationIcd10Display: "Pneumonia, unspecified organism",
				priority: "urgent",
			},
			"user-1"
		)

		expect(orderInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				encounterId,
				modality: "xray",
				bodyPart: "Chest",
				clinicalIndication: "Fever and productive cough",
				indicationIcd10Code: "J18.9",
				indicationIcd10Display: "Pneumonia, unspecified organism",
				priority: "urgent",
				status: "ordered",
				orderingStaffId: "staff-physician",
			})
		)
		expect(auditInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				userId: "user-1",
				staffProfileId: "staff-physician",
				action: "sign",
				entityType: "imaging_order",
				entityId: imagingOrderId,
				metadata: expect.objectContaining({
					encounterId,
					indicationIcd10Code: "J18.9",
				}),
			})
		)
		expect(slaInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				encounterId,
				toStatus: "imaging_ordered",
				staffId: "staff-physician",
			})
		)
		expect(result).toEqual({ id: imagingOrderId })
	})

	it("creates an e-prescription with facility-scoped PRC and PTR credentials", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const patientId = "d7f56ece-966e-4266-8f3c-ea71d58ee79b"
		const medicationOrderId = "77777777-7777-4777-9777-777777777777"
		const prescriptionId = "88888888-8888-4888-9888-888888888888"
		const insertBuilder = createInsertBuilder([{ id: prescriptionId }])

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
							pdeaS2License: null,
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId, patientId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: medicationOrderId,
							facilityId,
							encounterId,
							genericName: "Paracetamol",
							brandName: "Biogesic",
							dose: "500",
							doseUnit: "mg",
							doseForm: "tablet",
							route: "oral",
							frequency: "once",
							durationDays: 3,
							specialInstructions: null,
							isPrn: false,
							prnReason: null,
							isControlledSubstance: false,
							pdeaSchedule: null,
							pdeaTrancheNumber: null,
							pdeaTrancheTotal: null,
							noRefillInscribed: false,
							status: "verified",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: prescriptionId,
						facilityId,
						encounterId,
						medicationOrderId,
						patientId,
						prescriberStaffId: "staff-prescriber",
						prescriberStaffName: "Dr. Test",
						prcLicenseNumber: "PRC-100001",
						ptrNumber: "PTR-100001",
						pdeaS2License: null,
						prescriptionContent: { genericName: "Paracetamol" },
						status: "draft",
						signedAt: null,
						createdAt: new Date("2026-05-17T02:00:00.000Z"),
					},
				])
			)
		mockDb.insert.mockImplementationOnce(() => insertBuilder)

		const result = await service.createPrescription(
			{ facilityId, encounterId, medicationOrderId, patientId },
			"user-1"
		)

		expect(insertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				prescriberStaffId: "staff-prescriber",
				prcLicenseNumber: "PRC-100001",
				ptrNumber: "PTR-100001",
				prescriptionContent: expect.objectContaining({
					genericName: "Paracetamol",
					brandName: "Biogesic",
					isControlledSubstance: false,
					noRefillInscribed: false,
				}),
				status: "draft",
			})
		)
		expect(result.prcLicenseNumber).toBe("PRC-100001")
		expect(result.ptrNumber).toBe("PTR-100001")
	})

	it("rejects e-prescription generation when patientId does not match the encounter", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: encounterId,
							facilityId,
							patientId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createPrescription(
				{
					facilityId,
					encounterId,
					medicationOrderId: "77777777-7777-4777-9777-777777777777",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
				},
				"user-1"
			)
		).rejects.toThrow("Prescription patientId does not match the selected encounter.")
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("prevents duplicate e-prescriptions for the same medication order", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const patientId = "d7f56ece-966e-4266-8f3c-ea71d58ee79b"
		const medicationOrderId = "77777777-7777-4777-9777-777777777777"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId, patientId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: medicationOrderId,
							facilityId,
							encounterId,
							genericName: "Paracetamol",
							brandName: null,
							dose: "500",
							doseUnit: "mg",
							doseForm: "tablet",
							route: "oral",
							frequency: "once",
							durationDays: null,
							specialInstructions: null,
							isPrn: false,
							prnReason: null,
							isControlledSubstance: false,
							pdeaSchedule: null,
							pdeaTrancheNumber: null,
							pdeaTrancheTotal: null,
							noRefillInscribed: false,
							status: "verified",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: "rx-existing", status: "draft" }], { withLimit: true })
			)

		await expect(
			service.createPrescription(
				{ facilityId, encounterId, medicationOrderId, patientId },
				"user-1"
			)
		).rejects.toThrow("A prescription already exists for this medication order.")
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("blocks controlled medication orders over 30 days on the non-tranched endpoint", async () => {
		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder(
				[
					{
						id: "staff-prescriber",
						userId: "user-1",
						facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
						isActive: true,
						pdeaS2License: "S2-100001",
						pdeaS2Expiry: "2099-12-31",
					},
				],
				{ withLimit: true }
			)
		)

		await expect(
			service.createMedOrder(
				{
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					genericName: "Morphine",
					dose: "10",
					doseUnit: "mg",
					doseForm: "tablet",
					route: "PO",
					frequency: "bid",
					durationDays: 45,
					isControlledSubstance: true,
					pdeaSchedule: "S2",
					cdsAlerts: [],
				},
				"user-1"
			)
		).rejects.toThrow("must be submitted through PDEA tranching")
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("reports S-2 licenses without expiry as invalid", async () => {
		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							pdeaS2License: "S2-100001",
							pdeaS2Expiry: null,
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ name: "Dr. Test" }], { withLimit: true })
			)

		const result = await service.checkPdeaLicense({
			staffId: "staff-prescriber",
			facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
		})

		expect(result.canPrescribeControlled).toBe(false)
		expect(result.errorMessage).toMatch(/expiry is not recorded/i)
	})

	it("rejects PDEA tranche previews over the 90-day cap", async () => {
		await expect(
			service.previewTranches({
				facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
				genericName: "Morphine",
				dose: "10",
				frequency: "bid",
				durationDays: 91,
				pdeaSchedule: "S-2",
			})
		).rejects.toThrow("cannot exceed 90 days")
	})

	it("rejects controlled prescription generation from a parent tranche course", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const patientId = "d7f56ece-966e-4266-8f3c-ea71d58ee79b"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
							pdeaS2License: "S2-100001",
							pdeaS2Expiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId, patientId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "parent-order",
							facilityId,
							encounterId,
							parentOrderId: null,
							genericName: "Morphine",
							brandName: null,
							dose: "10",
							doseUnit: "mg",
							doseForm: "tablet",
							route: "PO",
							frequency: "bid",
							durationDays: 90,
							specialInstructions: null,
							isPrn: false,
							prnReason: null,
							isControlledSubstance: true,
							pdeaSchedule: "S-2",
							pdeaTrancheNumber: null,
							pdeaTrancheTotal: 3,
							noRefillInscribed: true,
							status: "verified",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.createPrescription(
				{ facilityId, encounterId, medicationOrderId: "parent-order", patientId },
				"user-1"
			)
		).rejects.toThrow("individual PDEA tranche orders")
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("adds PDEA No Refill and dispense-date instructions to tranche prescriptions", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const encounterId = "99999999-9999-4999-9999-999999999999"
		const patientId = "d7f56ece-966e-4266-8f3c-ea71d58ee79b"
		const medicationOrderId = "77777777-7777-4777-9777-777777777777"
		const prescriptionId = "88888888-8888-4888-9888-888888888888"
		const insertBuilder = createInsertBuilder([{ id: prescriptionId }])

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
							pdeaS2License: "S2-100001",
							pdeaS2Expiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ id: encounterId, facilityId, patientId }], { withLimit: true })
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: medicationOrderId,
							facilityId,
							encounterId,
							parentOrderId: "parent-order",
							genericName: "Morphine",
							brandName: null,
							dose: "10",
							doseUnit: "mg",
							doseForm: "tablet",
							route: "PO",
							frequency: "bid",
							durationDays: 30,
							specialInstructions: null,
							isPrn: false,
							prnReason: null,
							isControlledSubstance: true,
							pdeaSchedule: "S-2",
							pdeaTrancheNumber: 2,
							pdeaTrancheTotal: 3,
							noRefillInscribed: true,
							cdsAlerts: { alerts: [], pdeaDispenseDate: "2026-06-16" },
							status: "verified",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() => createSelectBuilder([], { withLimit: true }))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: prescriptionId,
						facilityId,
						encounterId,
						medicationOrderId,
						patientId,
						prescriberStaffId: "staff-prescriber",
						prescriberStaffName: "Dr. Test",
						prcLicenseNumber: "PRC-100001",
						ptrNumber: "PTR-100001",
						pdeaS2License: "S2-100001",
						prescriptionContent: { genericName: "Morphine" },
						status: "draft",
						signedAt: null,
						createdAt: new Date("2026-05-17T02:00:00.000Z"),
					},
				])
			)
		mockDb.insert.mockImplementationOnce(() => insertBuilder)

		await service.createPrescription(
			{ facilityId, encounterId, medicationOrderId, patientId },
			"user-1"
		)

		expect(insertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				pdeaS2License: "S2-100001",
				prescriptionContent: expect.objectContaining({
					isControlledSubstance: true,
					pdeaSchedule: "S-2",
					pdeaTrancheNumber: 2,
					pdeaTrancheTotal: 3,
					noRefillInscribed: true,
					pdeaDispenseDate: "2026-06-16",
					pdeaDispensingInstructions:
						"No Refill. Tranche 2 of 3. Earliest dispense date: 2026-06-16.",
				}),
			})
		)
	})

	it("allows only the prescribing clinician with active PRC and PTR to sign", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const createdAt = new Date("2026-05-17T02:00:00.000Z")
		const prescription = {
			id: "88888888-8888-4888-9888-888888888888",
			facilityId,
			encounterId: "99999999-9999-4999-9999-999999999999",
			medicationOrderId: "77777777-7777-4777-9777-777777777777",
			patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
			prescriberStaffId: "staff-prescriber",
			prescriberStaffName: "Dr. Test",
			prcLicenseNumber: "PRC-100001",
			ptrNumber: "PTR-100001",
			pdeaS2License: null,
			prescriptionContent: { genericName: "Paracetamol" },
			status: "draft",
			signedAt: null,
			createdAt,
		}
		const updateBuilder = createUpdateBuilder()

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([prescription]))
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-100001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-100001",
							ptrExpiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ ...prescription, status: "signed", signedAt: createdAt }])
			)
		mockDb.update.mockImplementationOnce(() => updateBuilder)

		const result = await service.signPrescription(prescription.id, "user-1")

		expect(updateBuilder.set).toHaveBeenCalledWith({
			status: "signed",
			signedAt: expect.any(Date),
		})
		expect(result.status).toBe("signed")
	})

	it("rejects prescription signing by a different clinician", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "88888888-8888-4888-9888-888888888888",
						facilityId,
						encounterId: "99999999-9999-4999-9999-999999999999",
						medicationOrderId: "77777777-7777-4777-9777-777777777777",
						patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
						prescriberStaffId: "staff-prescriber",
						prescriberStaffName: "Dr. Test",
						prcLicenseNumber: "PRC-100001",
						ptrNumber: "PTR-100001",
						pdeaS2License: null,
						prescriptionContent: { genericName: "Paracetamol" },
						status: "draft",
						signedAt: null,
						createdAt: new Date("2026-05-17T02:00:00.000Z"),
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-other",
							userId: "user-2",
							facilityId,
							isActive: true,
							prcLicenseNumber: "PRC-200001",
							prcExpiry: "2099-12-31",
							ptrNumber: "PTR-200001",
							ptrExpiry: "2099-12-31",
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.signPrescription("88888888-8888-4888-9888-888888888888", "user-2")
		).rejects.toBeInstanceOf(ForbiddenException)
		expect(mockDb.update).not.toHaveBeenCalled()
	})

	it("records signed prescription delivery with audit metadata", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"
		const prescription = {
			id: "88888888-8888-4888-9888-888888888888",
			facilityId,
			encounterId: "99999999-9999-4999-9999-999999999999",
			medicationOrderId: "77777777-7777-4777-9777-777777777777",
			patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
			prescriberStaffId: "staff-prescriber",
			prescriberStaffName: "Dr. Test",
			prcLicenseNumber: "PRC-100001",
			ptrNumber: "PTR-100001",
			pdeaS2License: null,
			prescriptionContent: { genericName: "Paracetamol" },
			status: "signed",
			signedAt: new Date("2026-05-17T02:00:00.000Z"),
			createdAt: new Date("2026-05-17T01:55:00.000Z"),
		}
		const auditInsertBuilder = createInsertBuilder([])

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([prescription]))
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-prescriber",
							userId: "user-1",
							facilityId,
							isActive: true,
						},
					],
					{ withLimit: true }
				)
			)
		mockDb.insert.mockImplementationOnce(() => auditInsertBuilder)

		const result = await service.sendPrescription(
			{
				id: prescription.id,
				channel: "email",
				email: "patient@example.com",
			},
			"user-1"
		)

		expect(result).toEqual(prescription)
		expect(auditInsertBuilder.values).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId,
				userId: "user-1",
				staffProfileId: "staff-prescriber",
				action: "update",
				entityType: "prescription",
				entityId: prescription.id,
				metadata: expect.objectContaining({
					operation: "sendPrescription",
					status: "signed",
					channel: "email",
					email: "patient@example.com",
					patientId: prescription.patientId,
					encounterId: prescription.encounterId,
				}),
			})
		)
	})

	it("rejects sending unsigned prescriptions", async () => {
		mockDb.select.mockImplementationOnce(() =>
			createSelectBuilder([
				{
					id: "88888888-8888-4888-9888-888888888888",
					facilityId: "8138a4f3-d2a7-41ba-8e12-2c4191aa174c",
					encounterId: "99999999-9999-4999-9999-999999999999",
					medicationOrderId: "77777777-7777-4777-9777-777777777777",
					patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
					prescriberStaffId: "staff-prescriber",
					prescriberStaffName: "Dr. Test",
					prcLicenseNumber: "PRC-100001",
					ptrNumber: "PTR-100001",
					pdeaS2License: null,
					prescriptionContent: { genericName: "Paracetamol" },
					status: "draft",
					signedAt: null,
					createdAt: new Date("2026-05-17T01:55:00.000Z"),
				},
			])
		)

		await expect(
			service.sendPrescription(
				{ id: "88888888-8888-4888-9888-888888888888", channel: "patient_portal" },
				"user-1"
			)
		).rejects.toBeInstanceOf(BadRequestException)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("rejects sending by a clinician who did not prescribe it", async () => {
		const facilityId = "8138a4f3-d2a7-41ba-8e12-2c4191aa174c"

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "88888888-8888-4888-9888-888888888888",
						facilityId,
						encounterId: "99999999-9999-4999-9999-999999999999",
						medicationOrderId: "77777777-7777-4777-9777-777777777777",
						patientId: "d7f56ece-966e-4266-8f3c-ea71d58ee79b",
						prescriberStaffId: "staff-prescriber",
						prescriberStaffName: "Dr. Test",
						prcLicenseNumber: "PRC-100001",
						ptrNumber: "PTR-100001",
						pdeaS2License: null,
						prescriptionContent: { genericName: "Paracetamol" },
						status: "issued",
						signedAt: new Date("2026-05-17T02:00:00.000Z"),
						createdAt: new Date("2026-05-17T01:55:00.000Z"),
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder(
					[
						{
							id: "staff-other",
							userId: "user-2",
							facilityId,
							isActive: true,
						},
					],
					{ withLimit: true }
				)
			)

		await expect(
			service.sendPrescription(
				{ id: "88888888-8888-4888-9888-888888888888", channel: "patient_portal" },
				"user-2"
			)
		).rejects.toBeInstanceOf(ForbiddenException)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})
})
