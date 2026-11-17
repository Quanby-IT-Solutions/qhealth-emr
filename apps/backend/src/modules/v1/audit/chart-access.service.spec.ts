import { ForbiddenException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { type AuditService } from "./audit.service"
import {
	BREAK_GLASS_REQUIRED_MESSAGE,
	ChartAccessService,
	type ChartAccessActor,
} from "./chart-access.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		update: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	breakGlassEvents: {
		id: "breakGlassEvents.id",
		facilityId: "breakGlassEvents.facilityId",
		clinicianStaffId: "breakGlassEvents.clinicianStaffId",
		patientId: "breakGlassEvents.patientId",
		accessExpiresAt: "breakGlassEvents.accessExpiresAt",
		accessGrantedAt: "breakGlassEvents.accessGrantedAt",
		recordsAccessed: "breakGlassEvents.recordsAccessed",
	},
	encounters: {
		id: "encounters.id",
		patientId: "encounters.patientId",
		status: "encounters.status",
		clinicianStaffId: "encounters.clinicianStaffId",
		attendingStaffId: "encounters.attendingStaffId",
		admittingStaffId: "encounters.admittingStaffId",
		queueCalledByStaffId: "encounters.queueCalledByStaffId",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		facilityId: "staffProfiles.facilityId",
	},
}))

function selectReturning(rows: unknown[]) {
	const limit = jest.fn().mockResolvedValue(rows)
	const orderBy = jest.fn().mockReturnValue({ limit })
	const where = jest.fn().mockReturnValue({ limit, orderBy })
	const from = jest.fn().mockReturnValue({ where })
	return { from, where, orderBy, limit }
}

function mockSelectRows(...rowSets: unknown[][]) {
	const chains = rowSets.map(selectReturning)
	;(db.select as jest.Mock).mockImplementation(() => {
		const next = chains.shift()
		if (!next) throw new Error("Unexpected select call")
		return { from: next.from }
	})
	return chains
}

function mockUpdate() {
	const where = jest.fn().mockResolvedValue(undefined)
	const set = jest.fn().mockReturnValue({ where })
	;(db.update as jest.Mock).mockReturnValue({ set })
	return { set, where }
}

const actor: ChartAccessActor = {
	userId: "doctor-user",
	rbacProfile: {
		activeRole: {
			id: "physician-role",
			permissions: [{ module: "audit", action: "create" }],
		},
		staffProfiles: [
			{
				id: "doctor-staff",
				facilityId: "facility-1",
				roles: [{ id: "physician-role" }],
			},
		],
	},
}

describe("ChartAccessService", () => {
	let service: ChartAccessService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new ChartAccessService({} as AuditService)
	})

	it("allows regular patient access for an assigned clinician", async () => {
		mockSelectRows([[{ id: "encounter-1" }]])

		const result = await service.ensurePatientChartReadAccess(actor, "patient-1", {
			entityType: "patient",
			entityId: "patient-1",
		})

		expect(result).toEqual({ mode: "regular", staffProfileId: "doctor-staff" })
		expect(db.update).not.toHaveBeenCalled()
	})

	it("allows regular patient access for the OPD coordinator serving the patient", async () => {
		mockSelectRows([[{ id: "encounter-1" }]])

		const result = await service.ensurePatientChartReadAccess(actor, "patient-1", {
			entityType: "patient",
			entityId: "patient-1",
		})

		expect(result).toEqual({ mode: "regular", staffProfileId: "doctor-staff" })
		expect(db.update).not.toHaveBeenCalled()
	})

	it("allows active break-glass access and records the accessed resource", async () => {
		mockSelectRows(
			[],
			[{ id: "break-glass-1", facilityId: "facility-1", recordsAccessed: null }],
			[{ recordsAccessed: null }]
		)
		const update = mockUpdate()

		const result = await service.ensurePatientChartReadAccess(actor, "patient-1", {
			entityType: "patient",
			entityId: "patient-1",
		})

		expect(result).toEqual({
			mode: "break_glass",
			breakGlassEventId: "break-glass-1",
			staffProfileId: "doctor-staff",
		})
		expect(update.set).toHaveBeenCalledWith({
			recordsAccessed: [
				expect.objectContaining({
					entityType: "patient",
					entityId: "patient-1",
					accessCount: 1,
				}),
			],
		})
	})

	it("increments recordsAccessed when the same resource is read again", async () => {
		mockSelectRows(
			[],
			[{ id: "break-glass-1", facilityId: "facility-1", recordsAccessed: null }],
			[
				{
					recordsAccessed: [
						{
							entityType: "patient",
							entityId: "patient-1",
							firstAccessedAt: "2026-01-01T00:00:00.000Z",
							lastAccessedAt: "2026-01-01T00:00:00.000Z",
							accessCount: 2,
						},
					],
				},
			]
		)
		const update = mockUpdate()

		await service.ensurePatientChartReadAccess(actor, "patient-1", {
			entityType: "patient",
			entityId: "patient-1",
		})

		expect(update.set).toHaveBeenCalledWith({
			recordsAccessed: [
				expect.objectContaining({
					entityType: "patient",
					entityId: "patient-1",
					accessCount: 3,
				}),
			],
		})
	})

	it("denies access when no regular access or unexpired break-glass event exists", async () => {
		mockSelectRows([], [])

		await expect(service.ensurePatientChartReadAccess(actor, "patient-1")).rejects.toThrow(
			new ForbiddenException(BREAK_GLASS_REQUIRED_MESSAGE)
		)
	})

	it("allows encounter access through an active patient break-glass event", async () => {
		mockSelectRows(
			[
				{
					id: "encounter-1",
					patientId: "patient-1",
					clinicianStaffId: "other-staff",
					attendingStaffId: null,
					admittingStaffId: null,
					queueCalledByStaffId: null,
				},
			],
			[{ id: "break-glass-1", facilityId: "facility-1", recordsAccessed: null }],
			[{ recordsAccessed: null }]
		)
		mockUpdate()

		const result = await service.ensureEncounterChartReadAccess(actor, "encounter-1", {
			entityType: "encounter",
			entityId: "encounter-1",
		})

		expect(result).toEqual({
			mode: "break_glass",
			breakGlassEventId: "break-glass-1",
			staffProfileId: "doctor-staff",
		})
	})

	it("allows regular encounter access for the OPD coordinator serving that encounter", async () => {
		mockSelectRows([
			{
				id: "encounter-1",
				patientId: "patient-1",
				clinicianStaffId: "other-staff",
				attendingStaffId: null,
				admittingStaffId: null,
				queueCalledByStaffId: "doctor-staff",
			},
		])

		const result = await service.ensureEncounterChartReadAccess(actor, "encounter-1", {
			entityType: "encounter",
			entityId: "encounter-1",
		})

		expect(result).toEqual({ mode: "regular", staffProfileId: "doctor-staff" })
		expect(db.update).not.toHaveBeenCalled()
	})
})
