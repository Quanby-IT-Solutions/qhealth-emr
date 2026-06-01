import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { TelemedicineService } from "./telemedicine.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		insert: jest.fn(),
		select: jest.fn(),
		update: jest.fn(),
	},
}))

jest.mock("@/config/env.config", () => ({
	env: {
		LIVEKIT_WS_URL: "wss://livekit.example.test",
	},
}))

jest.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	count: jest.fn(),
	desc: jest.fn(),
	eq: (left: unknown, right: unknown) => ({ op: "eq", left, right }),
}))

jest.mock("@repo/db/schema", () => ({
	encounters: {
		id: "encounters.id",
		facilityId: "encounters.facilityId",
		patientId: "encounters.patientId",
	},
	facilities: {},
	patients: {},
	roles: {},
	staffProfiles: {},
	telemedicineAbstracts: {},
	telemedicineAppointments: {
		id: "telemedicineAppointments.id",
		status: "telemedicineAppointments.status",
		facilityId: "telemedicineAppointments.facilityId",
		patientId: "telemedicineAppointments.patientId",
		clinicianStaffId: "telemedicineAppointments.clinicianStaffId",
		updatedAt: "telemedicineAppointments.updatedAt",
	},
	telemedicineEncounters: {
		id: "telemedicineEncounters.id",
		appointmentId: "telemedicineEncounters.appointmentId",
	},
	telemedicinePrescriptionItems: {},
	telemedicinePrescriptions: {},
	userRoles: {},
	users: {},
}))

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440001"
const OTHER_FACILITY_ID = "550e8400-e29b-41d4-a716-446655440002"
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440003"
const OTHER_PATIENT_ID = "550e8400-e29b-41d4-a716-446655440004"
const PHYSICIAN_STAFF_ID = "550e8400-e29b-41d4-a716-446655440005"
const APPOINTMENT_ID = "550e8400-e29b-41d4-a716-446655440006"
const LINKED_ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440007"
const TELE_ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440008"

function makeSelectRowsChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
	chain.leftJoin = jest.fn(() => chain)
	chain.where = jest.fn(() => chain)
	chain.limit = jest.fn(() => Promise.resolve(rows))
	chain.then = jest.fn(
		(resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
			Promise.resolve(rows).then(resolve, reject)
	)
	return chain
}

function queueSelectRows(...rowsByQuery: unknown[][]) {
	for (const rows of rowsByQuery) {
		;(db.select as jest.Mock).mockImplementationOnce(() => makeSelectRowsChain(rows))
	}
}

function mockInsertEncounter() {
	const returning = jest.fn().mockResolvedValue([
		{
			id: TELE_ENCOUNTER_ID,
		},
	])
	const values = jest.fn(() => ({ returning }))
	;(db.insert as jest.Mock).mockReturnValue({ values })
	return { values }
}

function mockUpdateAppointment() {
	const where = jest.fn().mockResolvedValue(undefined)
	const set = jest.fn(() => ({ where }))
	;(db.update as jest.Mock).mockReturnValue({ set })
}

function appointmentRow() {
	return {
		id: APPOINTMENT_ID,
		status: "scheduled",
		facilityId: FACILITY_ID,
		patientId: PATIENT_ID,
		clinicianStaffId: PHYSICIAN_STAFF_ID,
	}
}

function createInput(overrides: Partial<Parameters<TelemedicineService["createEncounter"]>[0]> = {}) {
	return {
		appointmentId: APPOINTMENT_ID,
		encounterType: "linked" as const,
		linkedEncounterId: LINKED_ENCOUNTER_ID,
		chiefComplaint: "Follow-up",
		subjectiveNotes: "",
		objectiveNotes: "",
		assessmentNotes: "",
		planNotes: "",
		diagnosis: "Improving",
		...overrides,
	}
}

describe("TelemedicineService - linked encounters", () => {
	let service: TelemedicineService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new TelemedicineService({} as never, {} as never, {} as never, {} as never)
		jest
			.spyOn(
				service as unknown as { writeTelemedicineAudit: () => Promise<void> },
				"writeTelemedicineAudit"
			)
			.mockResolvedValue(undefined)
		jest.spyOn(service, "getEncounter").mockResolvedValue({ id: TELE_ENCOUNTER_ID } as never)
	})

	it("creates a linked telemedicine encounter for the same patient and facility", async () => {
		queueSelectRows(
			[appointmentRow()],
			[],
			[{ id: LINKED_ENCOUNTER_ID, facilityId: FACILITY_ID, patientId: PATIENT_ID }]
		)
		const insert = mockInsertEncounter()
		mockUpdateAppointment()

		await service.createEncounter(createInput(), PHYSICIAN_STAFF_ID)

		expect(insert.values).toHaveBeenCalledWith(
			expect.objectContaining({
				encounterType: "linked",
				linkedEncounterId: LINKED_ENCOUNTER_ID,
			})
		)
	})

	it("rejects a linked encounter from a different patient or facility", async () => {
		queueSelectRows(
			[appointmentRow()],
			[],
			[{ id: LINKED_ENCOUNTER_ID, facilityId: OTHER_FACILITY_ID, patientId: OTHER_PATIENT_ID }]
		)

		await expect(service.createEncounter(createInput(), PHYSICIAN_STAFF_ID)).rejects.toThrow(
			"Linked encounter must belong to the same facility and patient."
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("rejects inconsistent standalone payloads that include a linked encounter", async () => {
		queueSelectRows([appointmentRow()], [])

		await expect(
			service.createEncounter(
				createInput({ encounterType: "standalone", linkedEncounterId: LINKED_ENCOUNTER_ID }),
				PHYSICIAN_STAFF_ID
			)
		).rejects.toBeInstanceOf(BadRequestException)
		expect(db.insert).not.toHaveBeenCalled()
	})
})
