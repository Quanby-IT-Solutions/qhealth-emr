/**
 * BIL-BE-06 — eSOA Generation coverage.
 *
 * Verifies acceptance criteria:
 *  1. generateEsoaFromInvoice is idempotent — returns existing unsent draft.
 *  2. generateEsoaFromInvoice rejects non-finalized invoices unless allowDraft=true.
 *  3. sendEsoa rejects unsettled invoice unless allowDraft=true with reason.
 *  4. sendEsoa emits audit row on successful delivery.
 */

import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

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
	cf4Claims: {},
	cf4StatusLog: {},
	cf5Claims: {},
	cf5StatusLog: {},
	cewsSnapshots: {},
	chargeMasterItems: {},
	charges: {},
	clinicalNotes: {},
	drgMappings: {},
	eligibilityChecks: {},
	encounters: {},
	encounterStatusEvents: {},
	esoaStatements: {
		id: "id",
		invoiceId: "invoiceId",
		version: "version",
		sentAt: "sentAt",
		sentVia: "sentVia",
		deliveryStatus: "deliveryStatus",
	},
	invoiceLineItems: {},
	invoices: { id: "id", facilityId: "facilityId", status: "status" },
	konsultaActivities: {},
	patients: {},
	payments: {},
	problems: {},
	receipts: {},
	staffProfiles: {},
	vitalSigns: {},
}))

jest.mock("@/common/philhealth/philhealth.adapter", () => ({
	PHILHEALTH_ADAPTER: Symbol("PHILHEALTH_ADAPTER"),
}))

jest.mock("@/config/env.config", () => ({ env: {} }))
jest.mock("@/utils/sla-events", () => ({ closeOpenSlaStep: jest.fn() }))
jest.mock("@/utils/sla-step-target", () => ({ resolveStepTarget: jest.fn() }))

const INVOICE = "inv-uuid-0001"
const STATEMENT = "esoa-0001"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	;(
		service as unknown as { getOptionalStaffProfileId: (u: string) => Promise<string | null> }
	).getOptionalStaffProfileId = async () => "staff-profile-1"
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-06 eSOA Generation & Delivery", () => {
	it("generateEsoaFromInvoice returns existing unsent draft (idempotent)", async () => {
		const invoice = { id: INVOICE, status: "paid", facilityId: "fac-1" }
		const existingUnsent = { id: STATEMENT, invoiceId: INVOICE, version: 1 }
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([invoice]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({
						orderBy: () => ({ limit: () => Promise.resolve([existingUnsent]) }),
					}),
				}),
			})

		const { service } = makeService()
		const res = await service.generateEsoaFromInvoice({ invoiceId: INVOICE })

		expect(res).toEqual(existingUnsent)
		// No insert performed because existing draft returned.
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("generateEsoaFromInvoice rejects non-finalized invoices unless allowDraft", async () => {
		const invoice = { id: INVOICE, status: "draft" }
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([invoice]) }) }),
		})

		const { service } = makeService()
		await expect(service.generateEsoaFromInvoice({ invoiceId: INVOICE })).rejects.toBeInstanceOf(
			BadRequestException
		)
	})

	it("sendEsoa rejects unsettled invoice without allowDraft", async () => {
		const statement = { id: STATEMENT, invoiceId: INVOICE, sentVia: null, deliveryStatus: null }
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([statement]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({ limit: () => Promise.resolve([{ status: "finalized" }]) }),
				}),
			})

		const { service } = makeService()
		await expect(
			service.sendEsoa({ id: STATEMENT, channel: "patient_portal" })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("sendEsoa rejects allowDraft=true without allowDraftReason", async () => {
		const statement = { id: STATEMENT, invoiceId: INVOICE, sentVia: null, deliveryStatus: null }
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([statement]) }) }),
		})

		const { service } = makeService()
		await expect(
			service.sendEsoa({ id: STATEMENT, channel: "patient_portal", allowDraft: true })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("sendEsoa records delivery and emits audit when invoice is paid", async () => {
		const statement = { id: STATEMENT, invoiceId: INVOICE, sentVia: null, deliveryStatus: null }
		const updated = { ...statement, sentVia: "patient_portal", deliveryStatus: "delivered" }
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([statement]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([{ status: "paid" }]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({ limit: () => Promise.resolve([{ facilityId: "fac-1" }]) }),
				}),
			})
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }),
		})

		const { service, audit } = makeService()
		const res = await service.sendEsoa({
			id: STATEMENT,
			channel: "patient_portal",
			staffId: "user-1",
		})

		expect(res.success).toBe(true)
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "update",
				entityType: "esoa_statement",
				metadata: expect.objectContaining({ operation: "sendEsoa", channel: "patient_portal" }),
			})
		)
	})

	it("sendEsoa rejects when statement not found", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
		})

		const { service } = makeService()
		await expect(
			service.sendEsoa({ id: "missing", channel: "patient_portal" })
		).rejects.toBeInstanceOf(NotFoundException)
	})
})
