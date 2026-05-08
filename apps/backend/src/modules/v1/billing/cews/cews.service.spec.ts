/**
 * BIL-BE-07 — CEWS Eligibility coverage.
 *
 * Verifies acceptance criteria:
 *  1. PIN format check rejects non-12-digit input before any external call.
 *  2. PIN dashes are stripped before format validation.
 *  3. verifyCewsMembership retries on transient errors (3 attempts).
 *  4. After 3 failures returns service_unavailable rather than throwing.
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
	esoaStatements: {},
	invoiceLineItems: {},
	invoices: {},
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

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-07 CEWS Eligibility", () => {
	it("rejects non-12-digit PIN before any external call", async () => {
		const { service } = makeService()
		await expect(
			service.verifyCewsMembership({ memberPin: "123-456", encounterId: "enc-1" })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("accepts hyphenated PIN (12-345678901-2 format)", async () => {
		const { service } = makeService()
		const res = await service.verifyCewsMembership({
			memberPin: "12-345678901-2",
			encounterId: "enc-1",
		})
		expect(res.memberPin).toBe("12-345678901-2")
		expect(res.serviceUnavailable).toBe(false)
	})

	it("retries up to 3 times on transient errors", async () => {
		const { service } = makeService()
		const callSpy = jest
			.spyOn(service as unknown as { callCewsApi: (i: unknown) => Promise<unknown> }, "callCewsApi")
			.mockRejectedValueOnce(new Error("flaky"))
			.mockRejectedValueOnce(new Error("flaky"))
			.mockResolvedValueOnce({
				memberPin: "12-345678901-2",
				memberName: "Test User",
				status: "active",
				benefitBalance: "1000.00",
				dependents: [],
				verifiedAt: new Date(),
				serviceUnavailable: false,
			})

		const res = await service.verifyCewsMembership({
			memberPin: "12-345678901-2",
			encounterId: "enc-1",
		})

		expect(callSpy).toHaveBeenCalledTimes(3)
		expect(res.status).toBe("active")
	})

	it("returns service_unavailable after 3 failed attempts", async () => {
		const { service } = makeService()
		jest
			.spyOn(service as unknown as { callCewsApi: (i: unknown) => Promise<unknown> }, "callCewsApi")
			.mockRejectedValue(new Error("CEWS down"))

		const res = await service.verifyCewsMembership({
			memberPin: "123456789012",
			encounterId: "enc-1",
		})

		expect(res.status).toBe("service_unavailable")
		expect(res.serviceUnavailable).toBe(true)
	}, 10000)
})
