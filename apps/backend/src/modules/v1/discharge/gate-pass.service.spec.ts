import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import type { DischargeClearancesService } from "./discharge-clearances.service"
import { GatePassService } from "./gate-pass.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => {
	const createTable = () =>
		new Proxy(
			{},
			{
				get: (_target, property) => String(property),
			}
		)

	return {
		beds: createTable(),
		clinicalNotes: createTable(),
		encounters: createTable(),
		gatePasses: createTable(),
		medicationOrders: createTable(),
		patients: createTable(),
		prescriptions: createTable(),
		wards: createTable(),
	}
})

type MockDb = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
}

function createSelectBuilder(result: unknown) {
	return {
		from: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockResolvedValue(result),
	}
}

function createUpdateBuilder() {
	return {
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockResolvedValue([]),
	}
}

describe("GatePassService", () => {
	let service: GatePassService
	let mockDb: MockDb
	let clearancesService: { allClearancesConfirmed: jest.Mock }

	beforeEach(() => {
		jest.clearAllMocks()
		mockDb = db as unknown as MockDb
		clearancesService = {
			allClearancesConfirmed: jest.fn().mockResolvedValue(true),
		}
		service = new GatePassService(clearancesService as unknown as DischargeClearancesService)
	})

	it("blocks inpatient gate pass issuance when the clinical discharge checklist is incomplete", async () => {
		jest
			.spyOn(
				service as unknown as { inpatientClinicalChecklistComplete: (encounterId: string) => Promise<boolean> },
				"inpatientClinicalChecklistComplete"
			)
			.mockResolvedValue(false)

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([]))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "encounter-1",
						facilityId: "facility-1",
						patientId: "patient-1",
						bedId: "bed-1",
						status: "pending_discharge",
						encounterType: "inpatient",
						admissionDatetime: new Date("2026-05-25T00:00:00.000Z"),
						dischargeDatetime: null,
						disposition: "home",
					},
				])
			)

		await expect(service.generateGatePass("encounter-1", "staff-1")).rejects.toBeInstanceOf(
			BadRequestException
		)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("does not require the inpatient clinical checklist for outpatient gate passes", async () => {
		const clinicalChecklistSpy = jest.spyOn(
			service as unknown as { inpatientClinicalChecklistComplete: (encounterId: string) => Promise<boolean> },
			"inpatientClinicalChecklistComplete"
		)

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([]))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "encounter-1",
						facilityId: "facility-1",
						patientId: "patient-1",
						bedId: null,
						status: "discharged",
						encounterType: "outpatient",
						admissionDatetime: new Date("2026-05-25T00:00:00.000Z"),
						dischargeDatetime: new Date("2026-05-25T01:00:00.000Z"),
						disposition: "home",
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ firstName: "Juan", lastName: "Dela Cruz" }])
			)

		mockDb.insert.mockImplementationOnce(() => ({
			values: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([{ id: "gate-pass-1" }]),
			}),
		}))
		mockDb.update.mockImplementation(() => createUpdateBuilder())

		await expect(service.generateGatePass("encounter-1", "staff-1")).resolves.toEqual({
			id: "gate-pass-1",
		})
		expect(clinicalChecklistSpy).not.toHaveBeenCalled()
		expect(mockDb.update).not.toHaveBeenCalled()
	})

	it("finalizes a pending-discharge encounter and releases the bed after issuing a gate pass", async () => {
		jest
			.spyOn(
				service as unknown as { inpatientClinicalChecklistComplete: (encounterId: string) => Promise<boolean> },
				"inpatientClinicalChecklistComplete"
			)
			.mockResolvedValue(true)

		mockDb.select
			.mockImplementationOnce(() => createSelectBuilder([]))
			.mockImplementationOnce(() =>
				createSelectBuilder([
					{
						id: "encounter-1",
						facilityId: "facility-1",
						patientId: "patient-1",
						bedId: "bed-1",
						status: "pending_discharge",
						encounterType: "inpatient",
						admissionDatetime: new Date("2026-05-25T00:00:00.000Z"),
						dischargeDatetime: null,
						disposition: null,
					},
				])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ firstName: "Juan", lastName: "Dela Cruz" }])
			)
			.mockImplementationOnce(() =>
				createSelectBuilder([{ bedNumber: "101", wardId: "ward-1" }])
			)
			.mockImplementationOnce(() => createSelectBuilder([{ name: "Medical Ward" }]))

		mockDb.insert.mockImplementationOnce(() => ({
			values: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([{ id: "gate-pass-1" }]),
			}),
		}))
		mockDb.update.mockImplementation(() => createUpdateBuilder())

		await expect(service.generateGatePass("encounter-1", "staff-1")).resolves.toEqual({
			id: "gate-pass-1",
		})

		expect(mockDb.update).toHaveBeenCalledTimes(2)
	})
})
