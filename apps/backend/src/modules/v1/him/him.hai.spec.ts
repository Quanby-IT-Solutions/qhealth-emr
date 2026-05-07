/**
 * HIM-BE-05 — HAI Reconciliation coverage.
 *
 * Verifies acceptance criteria:
 *  1. decideHai inserts row when no prior decision.
 *  2. decideHai is idempotent on hai_tag_id — re-deciding overwrites.
 *  3. haiReport returns aggregated counts + incidence per 1000 patient days.
 */

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
	beds: { id: "id", wardId: "wardId" },
	chartDeficiencies: {},
	clinicalNotes: {},
	codeVersions: {},
	deficiencyNotifications: {},
	encounterCodes: {},
	encounters: { id: "id", bedId: "bedId" },
	haiReconciliations: {
		id: "id",
		haiTagId: "haiTagId",
		decision: "decision",
		previousType: "previousType",
		newType: "newType",
		reason: "reason",
		decidedByStaffId: "decidedByStaffId",
		decidedAt: "decidedAt",
		facilityId: "facilityId",
	},
	haiTags: {
		id: "id",
		facilityId: "facilityId",
		haiType: "haiType",
		status: "status",
		encounterId: "encounterId",
		onsetDate: "onsetDate",
	},
	medicalRecordsRequests: {},
	recordsReleaseAudit: {},
	staffProfiles: {},
	wards: { id: "id", name: "name" },
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
	jest.clearAllMocks()
})

describe("HIM-BE-05 HAI Reconciliation", () => {
	it("decideHai inserts row when no prior decision", async () => {
		const tag = { id: "h-1", facilityId: "fac-1", haiType: "clabsi", status: "suspected" }
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([tag]) }) }),
			})
			.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([]) }) })
		const insertValues = jest
			.fn()
			.mockReturnValue({ returning: () => Promise.resolve([{ id: "rec-1", decision: "confirm" }]) })
		;(db.insert as jest.Mock).mockReturnValue({ values: insertValues })
		;(db.update as jest.Mock).mockReturnValue({
			set: () => ({ where: () => Promise.resolve(undefined) }),
		})

		const { service } = makeService()
		const res = await service.decideHai({
			haiTagId: "h-1",
			decision: "confirm",
			staffId: STAFF_USER,
		})
		expect(res.decision).toBe("confirm")
		expect(insertValues).toHaveBeenCalled()
	})

	it("decideHai is idempotent — overwrites existing decision", async () => {
		const tag = { id: "h-1", facilityId: "fac-1", haiType: "clabsi", status: "suspected" }
		const existing = { id: "rec-existing", haiTagId: "h-1", decision: "confirm" }
		;(db.select as jest.Mock)
			.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: () => Promise.resolve([tag]) }) }),
			})
			.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([existing]) }) })
		const updateSet = jest.fn().mockReturnValue({
			where: () => ({ returning: () => Promise.resolve([{ ...existing, decision: "dismiss" }]) }),
		})
		;(db.update as jest.Mock).mockReturnValue({ set: updateSet })

		const { service } = makeService()
		const res = await service.decideHai({
			haiTagId: "h-1",
			decision: "dismiss",
			reason: "not HAI",
			staffId: STAFF_USER,
		})
		expect(res.decision).toBe("dismiss")
		expect(updateSet).toHaveBeenCalled()
	})

	it("haiReport returns aggregated counts by type and ward + incidence", async () => {
		const tags = [
			{ haiType: "clabsi", encounterId: "e-1", wardName: "ICU" },
			{ haiType: "clabsi", encounterId: "e-2", wardName: "Ward A" },
			{ haiType: "vap", encounterId: "e-1", wardName: "ICU" },
		]
		;(db.select as jest.Mock).mockReturnValue({
			from: () => ({
				leftJoin: () => ({
					leftJoin: () => ({
						leftJoin: () => ({ where: () => Promise.resolve(tags) }),
					}),
				}),
			}),
		})

		const { service } = makeService()
		const res = await service.haiReport({
			facilityId: "fac-1",
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
		})
		expect(res.totalTags).toBe(3)
		expect(res.byType.clabsi).toBe(2)
		expect(res.byType.vap).toBe(1)
		expect(res.byWard.ICU).toBe(2)
		expect(res.byWard["Ward A"]).toBe(1)
		expect(res.patientDays).toBeGreaterThan(0)
		expect(res.incidencePer1000PatientDays).toBeGreaterThan(0)
	})

	it("haiExport returns a CSV data URI with AHSR-ready headers", async () => {
		const { service } = makeService()
		;(
			service as unknown as {
				haiReport: (input: {
					facilityId: string
					periodStart: string
					periodEnd: string
				}) => Promise<unknown>
			}
		).haiReport = async () => ({
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
			totalTags: 3,
			patientDays: 60,
			incidencePer1000PatientDays: 50,
			byType: { clabsi: 2, vap: 1 },
			byWard: { "ICU": 2, "Ward A": 1 },
		})

		const res = await service.haiExport({
			facilityId: "fac-1",
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
			format: "csv",
		})

		expect(res.format).toBe("csv")
		expect(res.uri.startsWith("data:text/csv")).toBe(true)
		expect(decodeURIComponent(res.uri)).toContain(
			"Ward,HAI Type,Cases,Patient Days,Incidence Per 1000 Patient Days,Period Start,Period End"
		)
	})

	it("haiExport returns a PDF data URI", async () => {
		const { service } = makeService()
		;(
			service as unknown as {
				haiReport: (input: {
					facilityId: string
					periodStart: string
					periodEnd: string
				}) => Promise<unknown>
			}
		).haiReport = async () => ({
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
			totalTags: 3,
			patientDays: 60,
			incidencePer1000PatientDays: 50,
			byType: { clabsi: 2, vap: 1 },
			byWard: { "ICU": 2, "Ward A": 1 },
		})

		const res = await service.haiExport({
			facilityId: "fac-1",
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
			format: "pdf",
		})

		expect(res.format).toBe("pdf")
		expect(res.uri.startsWith("data:application/pdf;base64,")).toBe(true)
	})
})
