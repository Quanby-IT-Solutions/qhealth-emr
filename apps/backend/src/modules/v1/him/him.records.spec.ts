/**
 * HIM-BE-04 — Records Issuance coverage.
 *
 * Verifies acceptance criteria:
 *  1. releaseRecords rejects without DPA consent.
 *  2. releaseRecords rejects when payment not cleared.
 *  3. releaseRecords writes audit row + flips request status to completed.
 */

import { BadRequestException } from "@nestjs/common"

import { HimService } from "./him.service"

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
	chartDeficiencies: {},
	clinicalNotes: {},
	codeVersions: {},
	deficiencyNotifications: {},
	encounterCodes: {},
	encounters: {},
	haiReconciliations: {},
	haiTags: {},
	medicalRecordsRequests: {
		id: "id",
		patientId: "patientId",
		facilityId: "facilityId",
		dpaConsentObtained: "dpaConsentObtained",
		identityVerified: "identityVerified",
		paidAt: "paidAt",
		status: "status",
		releasedAt: "releasedAt",
		releasedByStaffId: "releasedByStaffId",
		updatedAt: "updatedAt",
	},
	recordsReleaseAudit: {
		id: "id",
		requestId: "requestId",
		patientId: "patientId",
		facilityId: "facilityId",
		actorStaffId: "actorStaffId",
		action: "action",
		recipient: "recipient",
		documentTypes: "documentTypes",
		contentHashes: "contentHashes",
		occurredAt: "occurredAt",
	},
	staffProfiles: {},
}))

import { db } from "@/common/database/database.client"

const STAFF_USER = "user-1"
const STAFF_PROFILE = "staff-1"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const eventEmitter = { emit: jest.fn().mockReturnValue(true) }
	const service = new HimService(audit as never, eventEmitter as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId = async () => STAFF_PROFILE
	return { service, audit, eventEmitter }
}

const baseRequest = {
	id: "req-1",
	patientId: "pt-1",
	facilityId: "fac-1",
	dpaConsentObtained: false,
	identityVerified: false,
	paidAt: null,
	status: "pending",
	releasedAt: null,
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe("HIM-BE-04 Records Issuance", () => {
	it("captureDpaConsent stores the gate and writes an audit row", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([{ ...baseRequest }]) }) }),
		})
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		const insertValues = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service, audit } = makeService()
		const res = await service.captureDpaConsent({ requestId: "req-1", signatureUri: "https://signed.example/dpa.pdf", staffId: STAFF_USER })

		expect(res).toEqual({ success: true })
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ dpaConsentObtained: true }))
		expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ action: "dpa_consent", requestId: "req-1" }))
		expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: "medical_records_request" }))
	})

	it("attachIdentityProof records verification evidence and sets identityVerified = true", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([{ ...baseRequest }]) }) }),
		})
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		const insertValues = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service, audit } = makeService()
		const res = await service.attachIdentityProof({
			requestId: "req-1",
			uri: "https://signed.example/id.png",
			documentType: "government_id",
			contentHash: "sha256:abc",
			staffId: STAFF_USER,
		})

		expect(res).toEqual({ success: true })
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ identityVerified: true }))
		expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
			action: "identity_proof",
			documentTypes: ["government_id"],
			contentHashes: ["sha256:abc"],
		}))
		expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ afterState: expect.objectContaining({ documentType: "government_id" }) }))
	})

	it("markRecordsPaymentCleared stores payment evidence and updates the request", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([{ ...baseRequest, dpaConsentObtained: true }]) }) }),
		})
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		const insertValues = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service } = makeService()
		const res = await service.markRecordsPaymentCleared({ requestId: "req-1", invoiceId: "inv-1", staffId: STAFF_USER })

		expect(res).toEqual({ success: true })
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ paidAt: expect.any(Date) }))
		expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ action: "payment_cleared", requestId: "req-1" }))
	})

	it("releaseRecords rejects without DPA consent", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([{ ...baseRequest }]) }) }),
		})
		const { service } = makeService()
		await expect(
			service.releaseRecords({
				requestId: "req-1",
				recipient: "Patient",
				documentTypes: ["discharge_summary"],
				contentHashes: ["abc"],
				staffId: STAFF_USER,
			})
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("releaseRecords rejects when identity not verified", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ ...baseRequest, dpaConsentObtained: true, identityVerified: false }]),
				}),
			}),
		})
		const { service } = makeService()
		await expect(
			service.releaseRecords({
				requestId: "req-1",
				recipient: "Patient",
				documentTypes: ["discharge_summary"],
				contentHashes: ["abc"],
				staffId: STAFF_USER,
			})
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("releaseRecords rejects when payment not cleared", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ ...baseRequest, dpaConsentObtained: true, identityVerified: true }]),
				}),
			}),
		})
		const { service } = makeService()
		await expect(
			service.releaseRecords({
				requestId: "req-1",
				recipient: "Patient",
				documentTypes: ["discharge_summary"],
				contentHashes: ["abc"],
				staffId: STAFF_USER,
			})
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("releaseRecords writes audit row + flips status to completed", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () => ({
					limit: () =>
						Promise.resolve([
							{ ...baseRequest, dpaConsentObtained: true, identityVerified: true, paidAt: new Date() },
						]),
				}),
			}),
		})
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		const insertValues = jest.fn().mockReturnValue({ returning: () => Promise.resolve([{ id: "audit-1" }]) })
		;(db.insert as jest.Mock).mockReturnValue({
			values: insertValues,
		})

		const { service, audit } = makeService()
		const res = await service.releaseRecords({
			requestId: "req-1",
			recipient: "Patient",
			documentTypes: ["discharge_summary"],
			contentHashes: ["abc"],
			staffId: STAFF_USER,
		})

		expect(res.success).toBe(true)
		expect(res.auditId).toBe("audit-1")
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }))
		expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
			action: "release",
			recipient: "Patient",
			documentTypes: ["discharge_summary"],
			contentHashes: ["abc"],
		}))
		expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: "medical_records_request" }))
	})
})
