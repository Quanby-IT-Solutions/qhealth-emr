/**
 * BIL-BE-02 — Charge Capture coverage.
 *
 * Verifies acceptance criteria of BIL-BE-02 against BillingService methods that
 * implement the charge capture flow (charge logic currently lives in the
 * monolith BillingService; sub-service split is tracked in BIL-BE-02 follow-up):
 *  1. createCharge persists a manual charge and emits an audit row.
 *  2. addChargeFromEvent is idempotent on (sourceType, sourceOrderId, encounterId).
 *  3. updateCharge writes an audit row carrying the override reason.
 *  4. markReadyForInvoicing rejects when no charges exist.
 *  5. markReadyForInvoicing emits an encounter-status event when charges exist.
 *  6. deleteCharge rejects deletion of auto-captured charges.
 */

import { BadRequestException } from "@nestjs/common"

import { BillingService } from "../billing.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		execute: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	charges: { id: "id", encounterId: "encounterId", facilityId: "facilityId", sourceType: "sourceType" },
	chargeMasterItems: { id: "id", facilityId: "facilityId", isActive: "isActive", description: "description", itemCode: "itemCode", category: "category" },
	encounterStatusEvents: {},
	encounters: {},
	patients: {},
	staffProfiles: {},
	cf4Claims: {},
	cf4StatusLog: {},
	cf5Claims: {},
	cewsSnapshots: {},
	clinicalNotes: {},
	drgMappings: {},
	eligibilityChecks: {},
	esoaStatements: {},
	invoiceLineItems: {},
	invoices: {},
	konsultaActivities: {},
	payments: {},
	problems: {},
	receipts: {},
	vitalSigns: {},
}))

jest.mock("@/common/philhealth/philhealth.adapter", () => ({
	PHILHEALTH_ADAPTER: Symbol("PHILHEALTH_ADAPTER"),
}))

jest.mock("@/config/env.config", () => ({
	env: { PHILHEALTH_BASE_URL: "https://example.test" },
}))

jest.mock("@/utils/sla-events", () => ({ closeOpenSlaStep: jest.fn() }))
jest.mock("@/utils/sla-step-target", () => ({ resolveStepTarget: jest.fn() }))

import { db } from "@/common/database/database.client"

const FACILITY = "fac-uuid-0001"
const ENCOUNTER = "enc-uuid-0001"
const STAFF_USER = "user-id-0001"
const STAFF_PROFILE = "staff-profile-0001"

function makeAudit() {
	return { log: jest.fn().mockResolvedValue(undefined) } as unknown as ConstructorParameters<typeof BillingService>[0]
}

function makeService() {
	const audit = makeAudit()
	const adapter = {
		submit: jest.fn(),
		poll: jest.fn(),
	}
	// Constructor: (philHealthAdapter, auditService)
	const service = new BillingService(adapter as never, audit as never)
	// Stub staff profile lookup
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId = async () => STAFF_PROFILE
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-02 Charge Capture", () => {
	it("createCharge persists charge and emits audit row", async () => {
		const inserted = {
			id: "charge-1",
			facilityId: FACILITY,
			encounterId: ENCOUNTER,
			description: "Chest X-Ray",
			quantity: "1",
			unitPrice: "500.00",
			totalAmount: "500.00",
			sourceType: "manual",
		}
		;(db.insert as jest.Mock).mockReturnValue({
			values: () => ({ returning: () => Promise.resolve([inserted]) }),
		})

		const { service, audit } = makeService()
		const result = await service.createCharge(
			{
				facilityId: FACILITY,
				encounterId: ENCOUNTER,
				description: "Chest X-Ray",
				quantity: 1,
				unitPrice: 500,
				chargeMasterItemId: undefined,
			},
			STAFF_USER
		)

		expect(result.id).toBe("charge-1")
		expect((audit as unknown as { log: jest.Mock }).log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "charge",
				entityId: "charge-1",
				metadata: expect.objectContaining({ sourceType: "manual" }),
			})
		)
	})

	it("addChargeFromEvent uses ON CONFLICT DO NOTHING for idempotent auto-pull", async () => {
		const onConflictDoNothing = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({
			values: () => ({ onConflictDoNothing }),
		})

		const { service } = makeService()
		await service.addChargeFromEvent({
			facilityId: FACILITY,
			encounterId: ENCOUNTER,
			sourceType: "auto_medication",
			sourceOrderId: "order-1",
			description: "Paracetamol 500mg",
			quantity: 1,
			unitPrice: 5,
		})

		expect(onConflictDoNothing).toHaveBeenCalledTimes(1)
	})

	it("updateCharge audits override reason in metadata", async () => {
		const existing = {
			id: "charge-1",
			facilityId: FACILITY,
			encounterId: ENCOUNTER,
			description: "X-Ray",
			quantity: "1",
			unitPrice: "500.00",
			totalAmount: "500.00",
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => Promise.resolve([existing]) }),
		})
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({
				where: () => ({ returning: () => Promise.resolve([{ ...existing, unitPrice: "300.00", totalAmount: "300.00" }]) }),
			}),
		})

		const { service, audit } = makeService()
		await service.updateCharge(
			{ id: "charge-1", unitPrice: 300, overrideReason: "negotiated rate" },
			STAFF_USER
		)

		expect((audit as unknown as { log: jest.Mock }).log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "update",
				entityType: "charge",
				metadata: expect.objectContaining({ overrideReason: "negotiated rate" }),
			})
		)
	})

	it("markReadyForInvoicing rejects when no charges exist", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
		})

		const { service } = makeService()
		await expect(
			service.markReadyForInvoicing({ encounterId: ENCOUNTER, facilityId: FACILITY, staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("markReadyForInvoicing inserts encounterStatusEvents row when charges exist", async () => {
		const insertValues = jest.fn().mockResolvedValue(undefined)
		// First select: existence (returns at least one row). Second select: count.
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "c-1" }]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([{ total: 3 }]) }),
			})
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service, audit } = makeService()
		const res = await service.markReadyForInvoicing({
			encounterId: ENCOUNTER,
			facilityId: FACILITY,
			staffId: STAFF_USER,
		})

		expect(res.success).toBe(true)
		expect(res.chargeCount).toBe(3)
		expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ toStatus: "ready_for_billing" }))
		expect((audit as unknown as { log: jest.Mock }).log).toHaveBeenCalled()
	})

	it("deleteCharge rejects deletion of auto-captured charges", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "charge-1",
							facilityId: FACILITY,
							encounterId: ENCOUNTER,
							sourceType: "auto_medication",
							description: "Paracetamol",
							quantity: "1",
							totalAmount: "5.00",
						},
					]),
			}),
		})

		const { service } = makeService()
		await expect(service.deleteCharge("charge-1", STAFF_USER)).rejects.toBeInstanceOf(BadRequestException)
	})
})
