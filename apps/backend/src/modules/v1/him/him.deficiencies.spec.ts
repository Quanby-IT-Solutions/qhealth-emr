/**
 * HIM-BE-02 — Deficiency tracking coverage.
 *
 * Verifies acceptance criteria:
 *  1. markDeficiencyResolved rejects when required artifact still missing.
 *  2. notifyDeficiency creates notification row + flips status to notified.
 *  3. scanDeficiencies idempotent on (encounterId, deficiencyType).
 */

import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { DeficienciesService } from "./deficiencies/deficiencies.service"
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
	chartDeficiencies: {
		id: "id",
		facilityId: "facilityId",
		encounterId: "encounterId",
		deficiencyType: "deficiencyType",
		sourceKind: "sourceKind",
		sourceId: "sourceId",
		status: "status",
		detectedAt: "detectedAt",
		ownerStaffId: "ownerStaffId",
		resolvedAt: "resolvedAt",
		resolvedByStaffId: "resolvedByStaffId",
		notes: "notes",
		updatedAt: "updatedAt",
	},
	clinicalNotes: { id: "id", encounterId: "encounterId", noteType: "noteType", status: "status" },
	codes: {
		id: "id",
		code: "code",
		codeSystemId: "codeSystemId",
		isDeprecated: "isDeprecated",
		replacedByCodeId: "replacedByCodeId",
		displayName: "displayName",
	},
	codeVersions: {},
	deficiencyNotifications: { id: "id", deficiencyId: "deficiencyId" },
	encounterCodes: { id: "id", encounterId: "encounterId" },
	encounters: { id: "id", facilityId: "facilityId", status: "status" },
	facilities: { id: "id" },
	haiReconciliations: { id: "id", haiTagId: "haiTagId" },
	haiTags: {
		id: "id",
		facilityId: "facilityId",
		haiType: "haiType",
		status: "status",
		encounterId: "encounterId",
		onsetDate: "onsetDate",
	},
	medicalRecordsRequests: { id: "id" },
	operationRecords: {
		id: "id",
		encounterId: "encounterId",
		procedurePerformed: "procedurePerformed",
		status: "status",
	},
	patients: {
		id: "id",
		mrn: "mrn",
		firstName: "firstName",
		lastName: "lastName",
		middleName: "middleName",
	},
	recordsReleaseAudit: { id: "id" },
	staffProfiles: { id: "id", userId: "userId" },
	users: { id: "id", name: "name" },
}))

const STAFF_USER = "user-1"
const STAFF_PROFILE = "staff-1"

function makeService() {
	const audit = { log: jest.fn().mockResolvedValue(undefined) }
	const eventEmitter = { emit: jest.fn().mockReturnValue(true) }
	const service = new HimService(audit as never, eventEmitter as never)
	;(service as unknown as { getStaffProfileId: (u: string) => Promise<string> }).getStaffProfileId =
		async () => STAFF_PROFILE
	return { service, audit, eventEmitter }
}

beforeEach(() => {
	jest.resetAllMocks()
})

describe("HIM-BE-02 Deficiency Tracking", () => {
	it("markDeficiencyResolved rejects when required artifact still missing", async () => {
		const def = {
			id: "d-1",
			facilityId: "fac-1",
			encounterId: "enc-1",
			deficiencyType: "undocumented_procedure",
			status: "open",
			notes: null,
		}
		// First select returns deficiency; second select returns an unsigned operation record.
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([def]) }) }),
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => Promise.resolve([{ id: "op-1", procedurePerformed: null, status: "draft" }]),
				}),
			})

		const { service } = makeService()
		await expect(
			service.markDeficiencyResolved({ id: "d-1", staffId: STAFF_USER })
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it("notifyDeficiency persists notification + flips status to notified", async () => {
		const def = {
			id: "d-1",
			facilityId: "fac-1",
			encounterId: "enc-1",
			deficiencyType: "missing_signature",
			status: "open",
			ownerStaffId: STAFF_PROFILE,
			detectedAt: new Date("2026-04-01T00:00:00Z"),
		}
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([def]) }) }),
		})
		const insertValues = jest
			.fn()
			.mockReturnValue({ returning: () => Promise.resolve([{ id: "notif-1" }]) })
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })
		const updateSet = jest.fn().mockReturnValue({ where: () => Promise.resolve(undefined) })
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })

		const { service, audit, eventEmitter } = makeService()
		const res = await service.notifyDeficiency({ id: "d-1", channel: "email", staffId: STAFF_USER })

		expect(res).toEqual({ success: true, notificationId: "notif-1" })
		expect(insertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				deficiencyId: "d-1",
				channel: "email",
				payload: expect.objectContaining({
					deficiencyType: "missing_signature",
					encounterId: "enc-1",
					facilityId: "fac-1",
				}),
			})
		)
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "notified" }))
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({ entityType: "chart_deficiency" })
		)
		expect(eventEmitter.emit).toHaveBeenCalledWith(
			"deficiency.notified",
			expect.objectContaining({ deficiencyId: "d-1", notificationId: "notif-1", channel: "email" })
		)
	})

	it("scanDeficiencies detects all required deficiency types for a discharged encounter", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([{ id: "enc-1", facilityId: "fac-1", attendingStaffId: "staff-1" }]),
			}),
		})

		const onConflictDoNothing = jest
			.fn()
			.mockResolvedValueOnce({ rowCount: 1 })
			.mockResolvedValueOnce({ rowCount: 1 })
			.mockResolvedValueOnce({ rowCount: 1 })
		const values = jest.fn().mockReturnValue({ onConflictDoNothing })
		;(db.insert as jest.Mock).mockReturnValue({ values })

		const { service } = makeService()
		;(
			service as unknown as {
				detectDeficiencySource: (
					encounterId: string,
					type: string
				) => Promise<{ missing: boolean; sourceKind: string | null; sourceId: string | null }>
			}
		).detectDeficiencySource = jest
			.fn()
			.mockResolvedValueOnce({ missing: true, sourceKind: "encounter", sourceId: "enc-1" })
			.mockResolvedValueOnce({ missing: true, sourceKind: "clinical_note", sourceId: "note-1" })
			.mockResolvedValueOnce({ missing: true, sourceKind: "operation_record", sourceId: "op-1" })

		const result = await service.scanDeficiencies({ facilityId: "fac-1", encounterId: "enc-1" })

		expect(result).toEqual({ scanned: 1, created: 3 })
		expect(values).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				encounterId: "enc-1",
				deficiencyType: "missing_discharge_summary",
				sourceId: "enc-1",
			})
		)
		expect(values).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				encounterId: "enc-1",
				deficiencyType: "missing_signature",
				sourceId: "note-1",
			})
		)
		expect(values).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({
				encounterId: "enc-1",
				deficiencyType: "undocumented_procedure",
				sourceId: "op-1",
			})
		)
	})

	it("scanDeficiencies remains idempotent when conflicts prevent new deficiency rows", async () => {
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				where: () =>
					Promise.resolve([{ id: "enc-1", facilityId: "fac-1", attendingStaffId: "staff-1" }]),
			}),
		})

		const onConflictDoNothing = jest
			.fn()
			.mockResolvedValueOnce({ rowCount: 0 })
			.mockResolvedValueOnce({ rowCount: 0 })
			.mockResolvedValueOnce({ rowCount: 0 })
		const values = jest.fn().mockReturnValue({ onConflictDoNothing })
		;(db.insert as jest.Mock).mockReturnValue({ values })

		const { service } = makeService()
		;(
			service as unknown as {
				detectDeficiencySource: (
					encounterId: string,
					type: string
				) => Promise<{ missing: boolean; sourceKind: string | null; sourceId: string | null }>
			}
		).detectDeficiencySource = jest
			.fn()
			.mockResolvedValue({ missing: true, sourceKind: "encounter", sourceId: "enc-1" })

		const result = await service.scanDeficiencies({ facilityId: "fac-1", encounterId: "enc-1" })

		expect(result).toEqual({ scanned: 1, created: 0 })
		expect(values).toHaveBeenCalledTimes(3)
	})

	it("handles encounter.discharged by triggering a targeted HIM scan", async () => {
		const himService = {
			scanDeficiencies: jest.fn().mockResolvedValue({ scanned: 1, created: 1 }),
		}

		const service = new DeficienciesService(himService as never)

		await service.handleEncounterDischarged({ facilityId: "fac-1", encounterId: "enc-1" })

		expect(himService.scanDeficiencies).toHaveBeenCalledWith({
			facilityId: "fac-1",
			encounterId: "enc-1",
		})
	})
})
