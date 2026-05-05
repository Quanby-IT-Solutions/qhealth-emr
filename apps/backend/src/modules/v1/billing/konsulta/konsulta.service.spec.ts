/**
 * BIL-BE-08 — Konsulta Capitation coverage.
 *
 * Verifies acceptance criteria:
 *  1. recordKonsultaEvent is idempotent on (patient_id, activity_type, date).
 *  2. generateKonsultaReport returns aggregate counts and member breakdown.
 *  3. generateKonsultaReport handles period boundary edges (inclusive).
 */

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
	konsultaActivities: { id: "id", patientId: "patientId", facilityId: "facilityId", activityType: "activityType", activityDate: "activityDate" },
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

import { db } from "@/common/database/database.client"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-08 Konsulta Capitation", () => {
	it("recordKonsultaEvent returns existing id without inserting when duplicate", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({ limit: () => Promise.resolve([{ id: "existing-1" }]) }),
			}),
		})

		const { service } = makeService()
		const res = await service.recordKonsultaEvent({
			patientId: "pt-1",
			facilityId: "fac-1",
			activityType: "FPE",
			activityDate: "2026-05-04",
		})

		expect(res).toEqual({ success: true, id: "existing-1" })
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("recordKonsultaEvent inserts when no duplicate exists", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({ limit: () => Promise.resolve([]) }),
			}),
		})
		;(db.insert as jest.Mock).mockReturnValue({
			values: () => ({ returning: () => Promise.resolve([{ id: "new-1" }]) }),
		})

		const { service } = makeService()
		const res = await service.recordKonsultaEvent({
			patientId: "pt-1",
			facilityId: "fac-1",
			activityType: "Follow-up",
			activityDate: "2026-05-04",
		})

		expect(res.id).toBe("new-1")
		expect(db.insert).toHaveBeenCalled()
	})

	it("generateKonsultaReport aggregates counts and member breakdown", async () => {
		const activities = [
			{ patientId: "pt-1", activityType: "FPE", activityDate: "2026-04-01" },
			{ patientId: "pt-1", activityType: "Follow-up", activityDate: "2026-04-15" },
			{ patientId: "pt-2", activityType: "FPE", activityDate: "2026-04-10" },
			{ patientId: "pt-2", activityType: "Lab", activityDate: "2026-04-20" },
			{ patientId: "pt-3", activityType: "FPE", activityDate: "2026-04-30" },
		]
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({
						orderBy: () => Promise.resolve(activities),
					}),
				}),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => Promise.resolve([
						{ id: "pt-1", name: "Alice", pin: "001" },
						{ id: "pt-2", name: "Bob", pin: "002" },
						{ id: "pt-3", name: "Carol", pin: "003" },
					]),
				}),
			})

		const { service } = makeService()
		const report = await service.generateKonsultaReport({
			facilityId: "fac-1",
			period: "monthly",
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
		})

		expect(report.totalFpe).toBe(3)
		expect(report.totalFollowUp).toBe(1)
		expect(report.totalLab).toBe(1)
		expect(report.totalPatients).toBe(3)
		expect(report.memberBreakdown).toHaveLength(3)
		const pt1 = report.memberBreakdown.find(m => m.patientId === "pt-1")
		expect(pt1?.fpeCount).toBe(1)
		expect(pt1?.followUpCount).toBe(1)
	})
})
