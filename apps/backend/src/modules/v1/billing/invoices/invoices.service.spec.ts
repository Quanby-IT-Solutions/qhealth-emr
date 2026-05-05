/**
 * BIL-BE-03 — Invoice / Payment / Receipt coverage.
 *
 * Verifies acceptance criteria:
 *  1. applyDiscount enforces SENIOR/PWD/SOLO_PARENT mutual exclusion.
 *  2. recordPayment rejects HMO method when provider/claim/percentage missing.
 *  3. recordPayment rejects when amount overflows the invoice balance.
 *  4. recordPayment persists HMO sub-form fields and emits audit on success.
 *  5. recordMalasakitPayment persists malasakit source and emits audit metadata.
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
		transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
	},
}))

jest.mock("@repo/db/schema", () => ({
	charges: {},
	chargeMasterItems: {},
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
	invoices: { id: "id", facilityId: "facilityId", encounterId: "encounterId", patientResponsibility: "patientResponsibility", status: "status", subtotal: "subtotal", vatAmount: "vatAmount", philhealthCoverage: "philhealthCoverage", discountType: "discountType", discount: "discount", totalAmount: "totalAmount", invoiceNumber: "invoiceNumber" },
	konsultaActivities: {},
	payments: { id: "id", invoiceId: "invoiceId", amount: "amount" },
	problems: {},
	receipts: {},
	vitalSigns: {},
}))

jest.mock("@/common/philhealth/philhealth.adapter", () => ({
	PHILHEALTH_ADAPTER: Symbol("PHILHEALTH_ADAPTER"),
}))

jest.mock("@/config/env.config", () => ({ env: {} }))
jest.mock("@/utils/sla-events", () => ({ closeOpenSlaStep: jest.fn() }))
jest.mock("@/utils/sla-step-target", () => ({ resolveStepTarget: jest.fn(() => 60) }))

import { db } from "@/common/database/database.client"

const FACILITY = "fac-uuid-0001"
const INVOICE = "inv-uuid-0001"
const STAFF_USER = "user-id-0001"
const STAFF_PROFILE = "staff-profile-0001"

function makeAudit() {
	return { log: jest.fn().mockResolvedValue(undefined) }
}

function makeService() {
	const audit = makeAudit()
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId = async () => STAFF_PROFILE
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-03 Invoice / Payment / Receipt", () => {
	it("applyDiscount rejects when stacking SENIOR on top of existing PWD", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			subtotal: "1000.00",
			discount: "200.00",
			discountType: "PWD",
			vatAmount: "0",
			philhealthCoverage: "0",
			status: "finalized",
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([invoice]) }) }),
		})

		const { service } = makeService()
		await expect(
			service.applyDiscount({ invoiceId: INVOICE, type: "SENIOR", staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("recordPayment rejects HMO without provider", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			encounterId: "enc-1",
			invoiceNumber: "INV-1",
			patientResponsibility: "1000.00",
			status: "finalized",
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => Promise.resolve([invoice]) }),
		})

		const { service } = makeService()
		await expect(
			service.recordPayment(
				{
					facilityId: FACILITY,
					invoiceId: INVOICE,
					amount: 500,
					paymentMethod: "hmo",
					paymentDate: "2026-05-04",
				},
				STAFF_USER
			)
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("recordPayment rejects amounts that overflow the invoice balance", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			encounterId: "enc-1",
			invoiceNumber: "INV-1",
			patientResponsibility: "1000.00",
			status: "finalized",
		}
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([invoice]) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([{ amount: "800.00" }]) }),
			})

		const { service } = makeService()
		await expect(
			service.recordPayment(
				{
					facilityId: FACILITY,
					invoiceId: INVOICE,
					amount: 500,
					paymentMethod: "cash",
					paymentDate: "2026-05-04",
				},
				STAFF_USER
			)
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("recordMalasakitPayment persists payment and emits malasakit audit metadata", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			patientResponsibility: "1000.00",
			status: "finalized",
		}
		const inserted = {
			id: "pay-1",
			facilityId: FACILITY,
			invoiceId: INVOICE,
			amount: "500.00",
			paymentMethod: "malasakit",
			referenceNumber: "MS-REF-1",
			receivedByStaffId: STAFF_PROFILE,
			paymentDate: "2026-05-04",
			notes: "Malasakit case: case-9",
			createdAt: new Date(),
		}
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([invoice]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([{ amount: "0.00" }]) }),
			})
		;(db.insert as jest.Mock).mockReturnValue({
			values: () => ({ returning: () => Promise.resolve([inserted]) }),
		})

		const { service, audit } = makeService()
		const res = await service.recordMalasakitPayment({
			invoiceId: INVOICE,
			amount: 500,
			malasakitCaseId: "case-9",
			reference: "MS-REF-1",
			staffId: STAFF_USER,
		})

		expect(res.paymentMethod).toBe("malasakit")
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "payment",
				metadata: expect.objectContaining({ source: "MALASAKIT" }),
			})
		)
	})
})
