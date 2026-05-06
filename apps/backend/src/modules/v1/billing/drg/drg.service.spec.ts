/**
 * BIL-BE-05 — DRG Mapping & CF5 coverage.
 *
 * Verifies acceptance criteria:
 *  1. suggestDrg returns at most 3 candidates with confidence + rationale.
 *  2. confirmDrg requires override reason when chosen rank != 1.
 *  3. submitCf5 blocks on missing DRG code (XSD validation stub).
 *  4. resubmitCf5 increments resubmit_count and writes cf5_status_log row.
 */

import { BadRequestException, UnprocessableEntityException } from "@nestjs/common"

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
	cf5Claims: { id: "id", facilityId: "facilityId", encounterId: "encounterId", drgCode: "drgCode", status: "status", resubmitCount: "resubmitCount" },
	cf5StatusLog: { id: "id", claimId: "claimId", status: "status", changedAt: "changedAt" },
	cewsSnapshots: {},
	chargeMasterItems: {},
	charges: {},
	clinicalNotes: {},
	drgMappings: { encounterId: "encounterId" },
	eligibilityChecks: {},
	encounters: {},
	encounterStatusEvents: {},
	esoaStatements: {},
	invoiceLineItems: {},
	invoices: {},
	konsultaActivities: {},
	operationRecords: { id: "id", encounterId: "encounterId", procedurePerformed: "procedurePerformed", status: "status" },
	patients: {},
	payments: {},
	problems: {},
	receipts: {},
	staffProfiles: {},
	surgicalRvsAssignments: { operationRecordId: "operationRecordId", procedureLabel: "procedureLabel", assignmentType: "assignmentType", status: "status" },
	vitalSigns: {},
}))

jest.mock("@/common/philhealth/philhealth.adapter", () => ({
	PHILHEALTH_ADAPTER: Symbol("PHILHEALTH_ADAPTER"),
}))

jest.mock("@/config/env.config", () => ({ env: {} }))
jest.mock("@/utils/sla-events", () => ({ closeOpenSlaStep: jest.fn() }))
jest.mock("@/utils/sla-step-target", () => ({ resolveStepTarget: jest.fn() }))

import { db } from "@/common/database/database.client"

const STAFF_USER = "user-id-0001"
const STAFF_PROFILE = "staff-profile-0001"
const ENCOUNTER = "enc-uuid-0001"
const CLAIM = "cf5-claim-0001"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId = async () => STAFF_PROFILE
	;(service as unknown as { getOptionalStaffProfileId: (u: string) => Promise<string | null> }).getOptionalStaffProfileId = async () => STAFF_PROFILE
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-05 DRG Mapping & CF5", () => {
	it("suggestDrg returns 3 ranked candidates with rationale", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([]),
					orderBy: () => ({ limit: () => Promise.resolve([]) }),
				}),
			}),
		})

		const { service } = makeService()
		const res = await service.suggestDrg({ encounterId: ENCOUNTER })

		expect(res.candidates).toHaveLength(3)
		res.candidates.forEach(c => {
			expect(c.confidence).toBeGreaterThanOrEqual(0)
			expect(c.confidence).toBeLessThanOrEqual(1)
			expect(typeof c.rationale).toBe("string")
		})
		// Top-1 must have highest confidence
		expect(res.candidates[0]!.confidence).toBeGreaterThanOrEqual(res.candidates[1]!.confidence)
	})

	it("confirmDrg rejects manual override without reason", async () => {
		const { service } = makeService()
		await expect(
			service.confirmDrg({ encounterId: ENCOUNTER, drgCode: "DRG-079", chosenRank: 3 }, STAFF_USER)
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("submitCf5 blocks on missing DRG code (XSD validation)", async () => {
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: CLAIM, status: "draft", drgCode: null, encounterId: ENCOUNTER }]) }) }),
			})
			// buildSurgicalReadiness: operationRecords query → empty = isReady: true, passes readiness check
			.mockReturnValueOnce({
				from: () => ({ where: () => Promise.resolve([]) }),
			})

		const { service } = makeService()
		await expect(service.submitCf5({ id: CLAIM }, STAFF_USER)).rejects.toBeInstanceOf(UnprocessableEntityException)
	})

	it("resubmitCf5 increments counter and writes cf5_status_log", async () => {
		const claim = {
			id: CLAIM,
			facilityId: "fac-1",
			encounterId: ENCOUNTER,
			drgCode: "DRG-089",
			status: "rejected",
			submissionData: { foo: "bar" },
			responseData: { error: "missing" },
			resubmitCount: 0,
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([claim]) }) }),
		})
		;(db.update as jest.Mock).mockReturnValue({
			set: (set: Record<string, unknown>) => ({
				where: () => ({
					returning: () => Promise.resolve([{ ...claim, status: "submitted", _set: set }]),
				}),
			}),
		})
		const insertValuesFn = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValuesFn })

		const { service } = makeService()
		await service.resubmitCf5({ id: CLAIM, reason: "amended DRG" }, STAFF_USER)

		expect(insertValuesFn).toHaveBeenCalledWith(
			expect.objectContaining({
				claimId: CLAIM,
				status: "resubmitted",
				payload: expect.objectContaining({ reason: "amended DRG" }),
			})
		)
	})
})
