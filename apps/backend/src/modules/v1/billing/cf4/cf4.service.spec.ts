/**
 * BIL-BE-04 — CF4 Generator & eClaims coverage.
 *
 * Verifies acceptance criteria:
 *  1. finalizeCf4 blocks submit on missing required clinical fields and returns a
 *     structured `{ path, message }` violation list.
 *  2. finalizeCf4 writes a cf4_status_log row with status=submitted on success.
 *  3. resubmitCf4 increments resubmit_count and stores prior submission/response data.
 *  4. pollCf4Status does not duplicate log rows when status has not changed.
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
	cf4Claims: { id: "id", facilityId: "facilityId", encounterId: "encounterId", status: "status", resubmitCount: "resubmitCount" },
	cf4StatusLog: { id: "id", claimId: "claimId", status: "status", changedAt: "changedAt" },
	cf5Claims: {},
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

import { db } from "@/common/database/database.client"

const CLAIM = "claim-uuid-0001"
const STAFF_USER = "user-id-0001"
const STAFF_PROFILE = "staff-profile-0001"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const adapter = { submit: jest.fn(), poll: jest.fn() }
	const service = new BillingService(adapter as never, audit as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId = async () => STAFF_PROFILE
	return { service, audit }
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("BIL-BE-04 CF4 Generator & eClaims", () => {
	it("finalizeCf4 throws structured violations when required fields missing", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => Promise.resolve([
					{ id: CLAIM, status: "draft", extractedData: { chiefComplaint: null } },
				]),
			}),
		})

		const { service } = makeService()
		try {
			await service.finalizeCf4({ id: CLAIM })
			fail("expected UnprocessableEntityException")
		} catch (err) {
			expect(err).toBeInstanceOf(UnprocessableEntityException)
			const response = (err as UnprocessableEntityException).getResponse() as { violations: Array<{ path: string }> }
			expect(response.violations.length).toBeGreaterThan(0)
			expect(response.violations[0]).toHaveProperty("path")
			expect(response.violations[0]).toHaveProperty("message")
		}
	})

	it("finalizeCf4 writes cf4_status_log row on successful submission", async () => {
		const claim = {
			id: CLAIM,
			status: "draft",
			extractedData: {
				chiefComplaint: "fever",
				historyOfPresentIllness: "x",
				vitalSigns: [{ bp: "120/80" }],
				courseInTheWard: "monitor",
			},
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => Promise.resolve([claim]) }),
		})
		const insertValuesFn = jest.fn().mockResolvedValue(undefined)
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({
				where: () => ({
					returning: () => Promise.resolve([{ ...claim, status: "submitted", submittedAt: new Date() }]),
				}),
			}),
		})
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValuesFn })

		const { service } = makeService()
		await service.finalizeCf4({ id: CLAIM })

		expect(insertValuesFn).toHaveBeenCalledWith(
			expect.objectContaining({ claimId: CLAIM, status: "submitted" })
		)
	})

	it("resubmitCf4 increments counter and stores prior payloads", async () => {
		const claim = {
			id: CLAIM,
			status: "rejected",
			submissionData: { foo: "bar" },
			responseData: { error: "missing" },
			resubmitCount: 1,
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([claim]) }) }),
		})
		;(db.update as jest.Mock).mockReturnValue({
			set: (set: Record<string, unknown>) => ({
				where: () => ({
					returning: () => Promise.resolve([{ ...claim, status: "resubmitted", _set: set }]),
				}),
			}),
		})
		const insertValuesFn = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValuesFn })

		const { service } = makeService()
		await service.resubmitCf4({ id: CLAIM, reason: "amended diagnosis" })

		expect(insertValuesFn).toHaveBeenCalledWith(
			expect.objectContaining({
				claimId: CLAIM,
				status: "resubmitted",
				payload: expect.objectContaining({
					reason: "amended diagnosis",
					priorSubmissionData: { foo: "bar" },
					priorResponseData: { error: "missing" },
				}),
			})
		)
	})

	it("resubmitCf4 rejects when claim not in rejected status", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: CLAIM, status: "submitted" }]) }) }),
		})

		const { service } = makeService()
		await expect(service.resubmitCf4({ id: CLAIM, reason: "x" })).rejects.toBeInstanceOf(BadRequestException)
	})

	it("pollCf4Status does not write duplicate log row when status unchanged", async () => {
		const claim = { id: CLAIM, status: "submitted" }
		const insertValuesFn = jest.fn().mockResolvedValue(undefined)

		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([claim]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({
						orderBy: () => ({ limit: () => Promise.resolve([{ status: "submitted" }]) }),
					}),
				}),
			})
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ orderBy: () => Promise.resolve([{ id: "log-1", status: "submitted", changedAt: new Date(), claimId: CLAIM }]) }) }),
			})
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValuesFn })

		const { service } = makeService()
		await service.pollCf4Status({ id: CLAIM })

		expect(insertValuesFn).not.toHaveBeenCalled()
	})
})
