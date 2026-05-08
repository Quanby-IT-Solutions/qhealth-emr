/**
 * HIM-BE-03 — ICD-10 Coding coverage.
 *
 * Verifies acceptance criteria:
 *  1. signCodes rejects when no codes exist.
 *  2. signCodes rejects when no Primary code marked.
 *  3. amendCodes rejects unsigned coding.
 *  4. amendCodes increments version + writes snapshot.
 *  5. validateCodes flags missing primary.
 */

import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

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
	chartDeficiencies: { id: "id", encounterId: "encounterId", deficiencyType: "deficiencyType" },
	clinicalNotes: { id: "id", encounterId: "encounterId", noteType: "noteType", status: "status" },
	codeVersions: { id: "id", encounterId: "encounterId", version: "version", snapshot: "snapshot" },
	deficiencyNotifications: {},
	encounterCodes: {
		id: "id",
		encounterId: "encounterId",
		code: "code",
		isPrimary: "isPrimary",
		signedAt: "signedAt",
		signedByStaffId: "signedByStaffId",
		version: "version",
	},
	encounters: {},
	haiReconciliations: {},
	haiTags: {
		id: "id",
		facilityId: "facilityId",
		haiType: "haiType",
		encounterId: "encounterId",
		onsetDate: "onsetDate",
		status: "status",
	},
	medicalRecordsRequests: {},
	recordsReleaseAudit: {},
	staffProfiles: {},
}))

const STAFF_USER = "user-1"
const STAFF_PROFILE = "staff-1"
const ENCOUNTER = "enc-1"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const eventEmitter = { emit: jest.fn().mockReturnValue(true) }
	const service = new HimService(audit as never, eventEmitter as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId =
		async () => STAFF_PROFILE
	;(
		service as unknown as {
			lookupDeprecatedIcd10: (codes: string[]) => Promise<Map<string, unknown>>
		}
	).lookupDeprecatedIcd10 = async () => new Map()
	;(
		service as unknown as { getAhsrReferenceCodes: (encounterId: string) => Promise<Set<string>> }
	).getAhsrReferenceCodes = async () => new Set()
	;(
		service as unknown as {
			getEncounterContext: (encounterId: string) => Promise<{ facilityId: string }>
		}
	).getEncounterContext = async () => ({ facilityId: "fac-1" })
	return { service, audit, eventEmitter }
}

beforeEach(() => {
	jest.resetAllMocks()
})

describe("HIM-BE-03 ICD-10 Coding", () => {
	it("signCodes rejects empty coding", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => Promise.resolve([]) }),
		})
		const { service } = makeService()
		await expect(
			service.signCodes({ encounterId: ENCOUNTER, staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("signCodes rejects when no Primary code marked", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{ id: "c-1", encounterId: ENCOUNTER, code: "J18.9", isPrimary: false, version: 1 },
					]),
			}),
		})
		const { service } = makeService()
		await expect(
			service.signCodes({ encounterId: ENCOUNTER, staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("signCodes emits coding.signed when signing succeeds", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "c-1",
							encounterId: ENCOUNTER,
							code: "J18.9",
							isPrimary: true,
							linkedDiagnosisRef: "problem:p-1",
							signedAt: null,
							version: 1,
						},
					]),
			}),
		})
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		const insertValues = jest.fn().mockReturnValue(Promise.resolve([{ id: "v-1" }]))
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service, eventEmitter } = makeService()
		;(
			service as unknown as { listCodes: (input: { encounterId: string }) => Promise<unknown> }
		).listCodes = async () => ({
			codes: [],
			signedAt: new Date(),
			currentVersion: 1,
			documentedDiagnoses: [],
			versionHistory: [],
		})
		await service.signCodes({ encounterId: ENCOUNTER, staffId: STAFF_USER })

		expect(updateSet).toHaveBeenCalledWith(
			expect.objectContaining({ signedByStaffId: STAFF_PROFILE })
		)
		expect(insertValues).toHaveBeenCalledWith(
			expect.objectContaining({ encounterId: ENCOUNTER, version: 1 })
		)
		expect(eventEmitter.emit).toHaveBeenCalledWith(
			"coding.signed",
			expect.objectContaining({ encounterId: ENCOUNTER, facilityId: "fac-1", version: 1 })
		)
	})

	it("signCodes blocks deprecated ICD-10 codes", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "c-1",
							encounterId: ENCOUNTER,
							code: "X00.0",
							isPrimary: true,
							linkedDiagnosisRef: "problem:p-1",
							signedAt: null,
							version: 1,
						},
					]),
			}),
		})
		const { service } = makeService()
		;(
			service as unknown as {
				lookupDeprecatedIcd10: (
					codes: string[]
				) => Promise<
					Map<
						string,
						{
							isDeprecated: boolean
							replacedByCodeId: string | null
							replacementCode: string | null
							replacementDisplay: string | null
						}
					>
				>
			}
		).lookupDeprecatedIcd10 = async () =>
			new Map([
				[
					"X00.0",
					{
						isDeprecated: true,
						replacedByCodeId: "rep-1",
						replacementCode: "Y00.0",
						replacementDisplay: "Replacement code",
					},
				],
			])

		await expect(
			service.signCodes({ encounterId: ENCOUNTER, staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("amendCodes rejects when coding not signed", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "c-1",
							encounterId: ENCOUNTER,
							code: "J18.9",
							isPrimary: true,
							signedAt: null,
							version: 1,
						},
					]),
			}),
		})
		const { service } = makeService()
		await expect(
			service.amendCodes({ encounterId: ENCOUNTER, reason: "fix", codes: [], staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("amendCodes writes a new version while preserving prior history", async () => {
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({
					where: () =>
						Promise.resolve([
							{
								id: "c-1",
								encounterId: ENCOUNTER,
								code: "J18.9",
								isPrimary: true,
								linkedDiagnosisRef: "problem:p-1",
								signedAt: new Date("2026-05-01T00:00:00Z"),
								version: 1,
							},
						]),
				}),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({ limit: () => Promise.resolve([{ id: "v-1" }]) }),
				}),
			})

		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })
		;(db.delete as jest.Mock).mockReturnValue({ where: () => Promise.resolve(undefined) })
		const insertValues = jest.fn().mockResolvedValue(undefined)
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })

		const { service, audit } = makeService()
		;(
			service as unknown as { listCodes: (input: { encounterId: string }) => Promise<unknown> }
		).listCodes = async () => ({
			codes: [],
			signedAt: null,
			currentVersion: 2,
			documentedDiagnoses: [],
			versionHistory: [],
		})

		await service.amendCodes({
			encounterId: ENCOUNTER,
			reason: "documentation update",
			staffId: STAFF_USER,
			codes: [{ code: "A00.0", isPrimary: true, linkedDiagnosisRef: "problem:p-1" }],
		})

		expect(updateSet).toHaveBeenCalledWith(
			expect.objectContaining({
				amendmentReason: "documentation update",
				replacedAt: expect.any(Date),
			})
		)
		expect(insertValues).toHaveBeenCalledWith([
			expect.objectContaining({
				encounterId: ENCOUNTER,
				code: "A00.0",
				isPrimary: true,
				version: 2,
			}),
		])
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({ afterState: expect.objectContaining({ version: 2 }) })
		)
	})

	it("validateCodes flags missing primary", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{ id: "c-1", encounterId: ENCOUNTER, code: "J18.9", isPrimary: false, version: 1 },
					]),
			}),
		})
		const { service } = makeService()
		const res = await service.validateCodes({ encounterId: ENCOUNTER })
		expect(res.hasPrimary).toBe(false)
		expect(res.violations.length).toBeGreaterThan(0)
		expect(res.violations[0]?.message).toMatch(/Primary/i)
	})

	it("validateCodes flags deprecated ICD-10 codes with a replacement suggestion", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: "c-1",
							encounterId: ENCOUNTER,
							code: "X00.0",
							isPrimary: true,
							linkedDiagnosisRef: "problem:p-1",
							version: 1,
						},
					]),
			}),
		})
		const { service } = makeService()
		;(
			service as unknown as {
				lookupDeprecatedIcd10: (
					codes: string[]
				) => Promise<
					Map<
						string,
						{
							isDeprecated: boolean
							replacedByCodeId: string | null
							replacementCode: string | null
							replacementDisplay: string | null
						}
					>
				>
			}
		).lookupDeprecatedIcd10 = async () =>
			new Map([
				[
					"X00.0",
					{
						isDeprecated: true,
						replacedByCodeId: "rep-1",
						replacementCode: "Y00.0",
						replacementDisplay: "Replacement code",
					},
				],
			])

		const res = await service.validateCodes({ encounterId: ENCOUNTER })

		expect(res.hasDeprecated).toBe(true)
		expect(res.violations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: "X00.0", suggestedReplacement: "Replacement code" }),
			])
		)
	})
})
