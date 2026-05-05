/**
 * SLA-016: Ancillary (lab/radiology) checkpoint tests
 *
 * Verifies that:
 * - updateLabOrder auto-sets specimenReceivedAt when status transitions to "collected"
 * - updateLabOrder persists explicit billingClearedAt
 * - updateLabOrder does NOT overwrite an existing specimenReceivedAt
 * - updateImagingOrder auto-sets studyStartedAt when status transitions to "in_progress"
 * - updateImagingOrder persists explicit billingClearedAt
 * - updateImagingOrder does NOT overwrite an existing studyStartedAt
 */

import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { OrdersService } from "./orders.service"

// ---------------------------------------------------------------------------
// DB Mock
// ---------------------------------------------------------------------------
const mockSelect = jest.fn()
const mockUpdate = jest.fn()
const mockSet = jest.fn()
const mockWhere = jest.fn()
const mockLimit = jest.fn()
const mockReturning = jest.fn()

const mockDb = {
	select: mockSelect,
	update: mockUpdate,
}

// Bypass the @repo/contracts barrel (which transitively loads @orpc/contract
// as ESM) — these tests don't use any contract objects at runtime.
jest.mock("@repo/contracts", () => ({
	SLA_STEP_DEFAULT_TARGETS: {},
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}))

// ProblemsAllergiesService mock (required constructor dep)
jest.mock("../problems-allergies/problems-allergies.service")
const { ProblemsAllergiesService } = jest.requireMock(
	"../problems-allergies/problems-allergies.service"
)

// Builds a chainable Drizzle select mock: any of from/leftJoin/where/orderBy
// return the same chain; .limit() resolves the provided rows.
function buildSelectChain(rows: unknown[]) {
	const chain: Record<string, unknown> = {}
	chain.from = jest.fn(() => chain)
	chain.leftJoin = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
	chain.where = jest.fn(() => chain)
	chain.orderBy = jest.fn(() => chain)
	chain.limit = jest.fn().mockResolvedValue(rows)
	chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve)
	return chain
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildLabOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "aaaa-1111-bbbb-2222-ccccddddeeee",
		facilityId: "fac-001",
		encounterId: "enc-001",
		preEncounterId: null,
		panelCode: "CBC",
		panelName: "Complete Blood Count",
		priority: "routine",
		status: "pending",
		orderingStaffId: "staff-001",
		orderingStaffName: "Dr. Smith",
		collectionDatetime: null,
		resultedDatetime: null,
		results: null,
		specimenReceivedAt: null,
		billingClearedAt: null,
		cdsAlerts: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	}
}

function buildImagingOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "aaaa-2222-bbbb-3333-ccccddddffff",
		facilityId: "fac-001",
		encounterId: "enc-001",
		preEncounterId: null,
		modality: "XR",
		bodyPart: "Chest",
		clinicalIndication: "Cough",
		priority: "routine",
		status: "pending",
		orderingStaffId: "staff-001",
		orderingStaffName: "Dr. Smith",
		scheduledDatetime: null,
		completedDatetime: null,
		report: null,
		structuredResults: null,
		studyStartedAt: null,
		billingClearedAt: null,
		cdsAlerts: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe("OrdersService — SLA-016 checkpoints", () => {
	let service: OrdersService

	beforeEach(async () => {
		jest.clearAllMocks()

		// Default chain for select: returns empty
		mockLimit.mockResolvedValue([])
		mockWhere.mockReturnValue({ limit: mockLimit })
		mockSelect.mockReturnValue({ from: jest.fn().mockReturnValue({ where: mockWhere }) })

		// Default chain for update
		mockReturning.mockResolvedValue([])
		mockWhere.mockReturnValue({ returning: mockReturning, limit: mockLimit })
		mockSet.mockReturnValue({ where: mockWhere })
		mockUpdate.mockReturnValue({ set: mockSet })

		const module: TestingModule = await Test.createTestingModule({
			providers: [OrdersService, { provide: ProblemsAllergiesService, useValue: {} }],
		}).compile()

		service = module.get<OrdersService>(OrdersService)
	})

	// ==========================================================================
	// Lab Orders — specimenReceivedAt
	// ==========================================================================

	describe("updateLabOrder", () => {
		it("auto-sets specimenReceivedAt when status transitions to 'collected' and no existing value", async () => {
			const order = buildLabOrder({ status: "pending", specimenReceivedAt: null })

			// findLabOrder calls select; second call is the post-update fetch
			mockSelect.mockImplementation(() => buildSelectChain([order]))
			mockReturning.mockResolvedValue([order])

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return { where: jest.fn().mockReturnValue({ returning: mockReturning }) }
			})

			await service.updateLabOrder({ id: order.id as string, status: "collected" })

			expect(capturedSet.specimenReceivedAt).toBeInstanceOf(Date)
			expect(capturedSet.status).toBe("collected")
		})

		it("does NOT overwrite an existing specimenReceivedAt", async () => {
			const existingTimestamp = new Date("2024-06-01T10:00:00Z")
			const order = buildLabOrder({ status: "collected", specimenReceivedAt: existingTimestamp })

			mockSelect.mockImplementation(() => buildSelectChain([order]))

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return {
					where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([order]) }),
				}
			})

			await service.updateLabOrder({ id: order.id as string, status: "collected" })

			// specimenReceivedAt should NOT be present in the update payload
			expect(capturedSet.specimenReceivedAt).toBeUndefined()
		})

		it("persists explicit billingClearedAt (SLA-016 Step 2)", async () => {
			const order = buildLabOrder({ status: "resulted" })
			const billingTs = new Date("2024-06-01T12:00:00Z")

			mockSelect.mockImplementation(() => buildSelectChain([order]))

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return {
					where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([order]) }),
				}
			})

			await service.updateLabOrder({ id: order.id as string, billingClearedAt: billingTs })

			expect(capturedSet.billingClearedAt).toBe(billingTs)
		})

		it("throws NotFoundException when lab order does not exist", async () => {
			mockSelect.mockImplementation(() => buildSelectChain([]))

			await expect(
				service.updateLabOrder({ id: "non-existent", status: "collected" })
			).rejects.toThrow(NotFoundException)
		})
	})

	// ==========================================================================
	// Imaging Orders — studyStartedAt
	// ==========================================================================

	describe("updateImagingOrder", () => {
		it("auto-sets studyStartedAt when status transitions to 'in_progress' and no existing value", async () => {
			const order = buildImagingOrder({ status: "scheduled", studyStartedAt: null })

			mockSelect.mockImplementation(() => buildSelectChain([order]))

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return {
					where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([order]) }),
				}
			})

			await service.updateImagingOrder({ id: order.id as string, status: "in_progress" })

			expect(capturedSet.studyStartedAt).toBeInstanceOf(Date)
			expect(capturedSet.status).toBe("in_progress")
		})

		it("does NOT overwrite an existing studyStartedAt", async () => {
			const existingTimestamp = new Date("2024-06-01T09:30:00Z")
			const order = buildImagingOrder({ status: "in_progress", studyStartedAt: existingTimestamp })

			mockSelect.mockImplementation(() => buildSelectChain([order]))

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return {
					where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([order]) }),
				}
			})

			await service.updateImagingOrder({ id: order.id as string, status: "in_progress" })

			expect(capturedSet.studyStartedAt).toBeUndefined()
		})

		it("persists explicit billingClearedAt (SLA-016 Step 2)", async () => {
			const order = buildImagingOrder({ status: "completed" })
			const billingTs = new Date("2024-06-01T12:30:00Z")

			mockSelect.mockImplementation(() => buildSelectChain([order]))

			let capturedSet: Record<string, unknown> = {}
			mockSet.mockImplementation((data: Record<string, unknown>) => {
				capturedSet = data
				return {
					where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([order]) }),
				}
			})

			await service.updateImagingOrder({ id: order.id as string, billingClearedAt: billingTs })

			expect(capturedSet.billingClearedAt).toBe(billingTs)
		})

		it("throws NotFoundException when imaging order does not exist", async () => {
			mockSelect.mockImplementation(() => buildSelectChain([]))

			await expect(
				service.updateImagingOrder({ id: "non-existent", status: "in_progress" })
			).rejects.toThrow(NotFoundException)
		})
	})
})
