/**
 * BIL-BE-03 — Payments service coverage.
 *
 * Complements invoices.service.spec.ts with payment-specific scenarios:
 *  1. recordPayment Cash success path emits audit + writes SLA event.
 *  2. recordPayment HMO with full sub-form persists provider/claim/percentage.
 *  3. issueReceipt allocates next sequential receipt number atomically per facility/fiscalYear.
 *  4. issueReceipt rejects when payment not found.
 */

import { NotFoundException } from "@nestjs/common"

import { BillingService } from "../billing.service"

interface TxMock {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
}

jest.mock("@/common/database/database.client", () => {
	const tx: TxMock = {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
	}
	return {
		db: {
			select: jest.fn(),
			insert: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			execute: jest.fn(),
			transaction: jest.fn(async (fn: (tx: TxMock) => Promise<unknown>) => fn(tx)),
			__tx: tx,
		},
	}
})

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
	invoices: {
		id: "id",
		facilityId: "facilityId",
		encounterId: "encounterId",
		patientResponsibility: "patientResponsibility",
		status: "status",
		invoiceNumber: "invoiceNumber",
	},
	konsultaActivities: {},
	payments: { id: "id", invoiceId: "invoiceId", amount: "amount", facilityId: "facilityId" },
	problems: {},
	receipts: { facilityId: "facilityId", fiscalYear: "fiscalYear", issuedAt: "issuedAt", receiptNumber: "receiptNumber" },
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
const PAYMENT = "pay-uuid-0001"
const STAFF_USER = "user-id-0001"
const STAFF_PROFILE = "staff-profile-0001"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId =
		async () => STAFF_PROFILE
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-03 Payments service", () => {
	it("recordPayment cash happy path persists row and emits audit", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			encounterId: "enc-1",
			invoiceNumber: "INV-1",
			patientResponsibility: "1000.00",
			status: "finalized",
		}
		const inserted = {
			id: PAYMENT,
			facilityId: FACILITY,
			invoiceId: INVOICE,
			amount: "1000.00",
			paymentMethod: "cash",
			receivedByStaffId: STAFF_PROFILE,
			paymentDate: "2026-05-04",
			createdAt: new Date(),
		}
		;(db.select as jest.Mock)
			// invoice fetch
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([invoice]) }),
			})
			// prior payments (overflow check)
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([]) }),
			})
			// existing payments after insert (status calc)
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([{ amount: "1000.00" }]) }),
			})
		;(db.insert as jest.Mock)
			// payments insert
			.mockReturnValueOnce({
				values: () => ({ returning: () => Promise.resolve([inserted]) }),
			})
			// encounter status event insert
			.mockReturnValueOnce({
				values: () => Promise.resolve(undefined),
			})
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({ where: () => Promise.resolve(undefined) }),
		})

		const { service, audit } = makeService()
		const res = await service.recordPayment(
			{
				facilityId: FACILITY,
				invoiceId: INVOICE,
				amount: 1000,
				paymentMethod: "cash",
				paymentDate: "2026-05-04",
			},
			STAFF_USER
		)

		expect(res.id).toBe(PAYMENT)
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "payment",
				metadata: expect.objectContaining({ source: "cash" }),
			})
		)
	})

	it("recordPayment HMO with full sub-form persists provider, claim, percentage", async () => {
		const invoice = {
			id: INVOICE,
			facilityId: FACILITY,
			encounterId: "enc-1",
			invoiceNumber: "INV-1",
			patientResponsibility: "1000.00",
			status: "finalized",
		}
		const captured: Array<Record<string, unknown>> = []
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([invoice]) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([]) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([{ amount: "800.00" }]) }),
			})
		;(db.insert as jest.Mock)
			.mockReturnValueOnce({
				values: (v: Record<string, unknown>) => {
					captured.push(v)
					return {
						returning: () =>
							Promise.resolve([
								{ id: PAYMENT, ...v, createdAt: new Date() } as Record<string, unknown>,
							]),
					}
				},
			})
			.mockReturnValueOnce({
				values: () => Promise.resolve(undefined),
			})
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({ where: () => Promise.resolve(undefined) }),
		})

		const { service } = makeService()
		await service.recordPayment(
			{
				facilityId: FACILITY,
				invoiceId: INVOICE,
				amount: 800,
				paymentMethod: "hmo",
				hmoProvider: "Maxicare",
				hmoClaimNumber: "MX-2026-001",
				hmoPercentageCovered: 80,
				paymentDate: "2026-05-04",
			},
			STAFF_USER
		)

		expect(captured[0]?.hmoProvider).toBe("Maxicare")
		expect(captured[0]?.hmoClaimNumber).toBe("MX-2026-001")
		expect(captured[0]?.hmoPercentageCovered).toBe("80")
	})

	it("issueReceipt allocates sequential receipt number atomically", async () => {
		const payment = { id: PAYMENT, facilityId: FACILITY }
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([payment]) }) }),
		})

		const txMock = (db as unknown as { __tx: { select: jest.Mock; insert: jest.Mock } }).__tx
		txMock.select.mockReturnValue({
			from: () => ({
				where: () => ({
					orderBy: () => ({
						limit: () => ({
							for: () => Promise.resolve([{ receiptNumber: "OR-2026-000041" }]),
						}),
					}),
				}),
			}),
		})
		txMock.insert.mockReturnValue({
			values: (v: Record<string, unknown>) => ({
				returning: () =>
					Promise.resolve([
						{
							id: "rcpt-1",
							facilityId: FACILITY,
							paymentId: PAYMENT,
							receiptNumber: v.receiptNumber as string,
							fiscalYear: v.fiscalYear as number,
							issuedByStaffId: STAFF_PROFILE,
							pdfUri: null,
							issuedAt: new Date(),
						},
					]),
			}),
		})

		const { service, audit } = makeService()
		const res = await service.issueReceipt({ paymentId: PAYMENT, staffId: STAFF_USER })

		expect(res.receiptNumber).toBe(`OR-${new Date().getFullYear()}-000042`)
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "create",
				entityType: "receipt",
				metadata: expect.objectContaining({ operation: "issueReceipt" }),
			})
		)
	})

	it("issueReceipt throws NotFoundException when payment is missing", async () => {
		;(db.select as jest.Mock).mockReturnValueOnce({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
		})

		const { service } = makeService()
		await expect(
			service.issueReceipt({ paymentId: "missing", staffId: STAFF_USER })
		).rejects.toBeInstanceOf(NotFoundException)
	})
})
