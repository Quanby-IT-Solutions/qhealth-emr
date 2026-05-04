import { NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { ProblemsAllergiesService } from "../problems-allergies/problems-allergies.service"
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
		encounters: createTable(),
		encounterStatusEvents: createTable(),
		formularyItems: createTable(),
		imagingOrders: createTable(),
		labOrders: createTable(),
		marEntries: createTable(),
		medicationOrders: createTable(),
		orderVerifications: createTable(),
		patients: createTable(),
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
		leftJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockImplementation(() =>
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

	beforeEach(() => {
		jest.clearAllMocks()
		mockDb = db as unknown as MockDb
		service = new OrdersService({
			getActiveAllergies: jest.fn(),
		} as unknown as ProblemsAllergiesService)
	})

	it("enriches the verification queue with patient context and alert counts", async () => {
		const createdAt = new Date("2025-04-16T10:00:00.000Z")

		mockDb.select
			.mockImplementationOnce(() =>
				createSelectBuilder([{ count: 1 }])
			)
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
					cdsAlerts: [
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

		mockDb.insert.mockImplementationOnce(() =>
			createInsertBuilder([{ id: "verification-1" }])
		)
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
		const updateBuilder = mockDb.update.mock.results[0]?.value as ReturnType<typeof createUpdateBuilder>
		expect(updateBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({ status: "active" })
		)
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
})
