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
	encounters: {},
	facilities: {},
	patients: {
		id: "patients.id",
		facilityId: "patients.facilityId",
		isActive: "patients.isActive",
	},
	roles: {
		id: "roles.id",
		name: "roles.name",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
		facilityId: "staffProfiles.facilityId",
		isActive: "staffProfiles.isActive",
	},
	telemedicineAbstracts: {},
	telemedicineAppointments: {
		id: "telemedicineAppointments.id",
		facilityId: "telemedicineAppointments.facilityId",
		patientId: "telemedicineAppointments.patientId",
		clinicianStaffId: "telemedicineAppointments.clinicianStaffId",
		scheduledDate: "telemedicineAppointments.scheduledDate",
		scheduledTime: "telemedicineAppointments.scheduledTime",
		durationMinutes: "telemedicineAppointments.durationMinutes",
		platform: "telemedicineAppointments.platform",
		patientInviteTokenHash: "telemedicineAppointments.patientInviteTokenHash",
		patientInviteExpiresAt: "telemedicineAppointments.patientInviteExpiresAt",
		notes: "telemedicineAppointments.notes",
		createdByStaffId: "telemedicineAppointments.createdByStaffId",
		livekitRoomName: "telemedicineAppointments.livekitRoomName",
		updatedAt: "telemedicineAppointments.updatedAt",
	},
	telemedicineEncounters: {},
	telemedicinePrescriptionItems: {},
	telemedicinePrescriptions: {},
	userRoles: {
		roleId: "userRoles.roleId",
		staffProfileId: "userRoles.staffProfileId",
	},
	users: {},
}))

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440001"
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440002"
const SCHEDULER_STAFF_ID = "550e8400-e29b-41d4-a716-446655440003"
const PHYSICIAN_STAFF_ID = "550e8400-e29b-41d4-a716-446655440004"
const NURSE_STAFF_ID = "550e8400-e29b-41d4-a716-446655440005"
const APPOINTMENT_ID = "550e8400-e29b-41d4-a716-446655440006"

type CreateAppointmentInput = Parameters<TelemedicineService["createAppointment"]>[0]

function createInput(overrides: Partial<CreateAppointmentInput> = {}): CreateAppointmentInput {
	return {
		facilityId: FACILITY_ID,
		patientId: PATIENT_ID,
		clinicianId: PHYSICIAN_STAFF_ID,
		scheduledDate: "2026-06-01",
		scheduledTime: "10:00",
		durationMinutes: 30,
		platform: "livekit",
		...overrides,
	}
}

function staffProfile(id: string, userId: string) {
	return {
		id,
		userId,
		facilityId: FACILITY_ID,
		isActive: true,
	}
}

function role(id: string, name: string) {
	return { roleId: id, roleName: name }
}

function makeSelectRowsChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
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

function mockInsertAppointment() {
	const returning = jest.fn().mockResolvedValue([
		{
			id: APPOINTMENT_ID,
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			clinicianStaffId: PHYSICIAN_STAFF_ID,
			scheduledDate: "2026-06-01",
			scheduledTime: "10:00",
			durationMinutes: 30,
			createdAt: new Date("2026-05-22T00:00:00.000Z"),
		},
	])
	const values = jest.fn(() => ({ returning }))
	;(db.insert as jest.Mock).mockReturnValue({ values })
	return { values, returning }
}

function mockUpdate() {
	const where = jest.fn().mockResolvedValue(undefined)
	const set = jest.fn(() => ({ where }))
	;(db.update as jest.Mock).mockReturnValue({ set })
	return { set, where }
}

describe("TelemedicineService - Scheduler Validation", () => {
	let service: TelemedicineService

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
		jest.setSystemTime(new Date("2026-05-22T00:00:00.000Z"))

		const liveKitService = {
			getRoomName: jest.fn((appointmentId: string) => `telemed-${appointmentId}`),
		}
		const auditService = { log: jest.fn().mockResolvedValue(undefined) }
		const mailerService = {
			isConfigured: jest.fn(() => false),
			send: jest.fn().mockResolvedValue({ delivered: false, messageId: null, transport: "log" }),
		}

		service = new TelemedicineService(
			{} as never,
			liveKitService as never,
			auditService as never,
			mailerService as never
		)
		jest
			.spyOn(
				service as unknown as { writeTelemedicineAudit: () => Promise<void> },
				"writeTelemedicineAudit"
			)
			.mockResolvedValue(undefined)
		jest.spyOn(service, "getAppointment").mockResolvedValue({
			id: APPOINTMENT_ID,
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			patientName: "Dela Cruz, Juan",
			patientMrn: "MRN-001",
			patientContactNumber: "09171234567",
			patientEmail: null,
			clinicianId: PHYSICIAN_STAFF_ID,
			clinicianName: "Dr. Reyes",
			clinicianSpecialty: "Family Medicine",
			scheduledDate: "2026-06-01",
			scheduledTime: "10:00",
			durationMinutes: 30,
			platform: "livekit",
			status: "scheduled",
			videoLink: null,
			meetingId: null,
			meetingPassword: null,
			livekitRoomName: "telemed-appt-1",
			livekitSessionStartedAt: null,
			livekitSessionEndedAt: null,
			patientInviteExpiresAt: null,
			patientInviteRevokedAt: null,
			patientInviteLastUsedAt: null,
			patientJoinedAt: null,
			notes: null,
			encounterId: null,
			createdAt: "2026-05-22T00:00:00.000Z",
			createdByName: "Scheduler User",
		})
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it("allows a scheduler to create an appointment with a valid physician", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "scheduler-user")],
			[role("role-scheduler", "Scheduler")],
			[staffProfile(PHYSICIAN_STAFF_ID, "physician-user")],
			[role("role-physician", "Physician")],
			[{ id: PATIENT_ID, facilityId: FACILITY_ID, isActive: true }],
			[{ id: PHYSICIAN_STAFF_ID, facilityId: FACILITY_ID, isActive: true }]
		)
		const insertChain = mockInsertAppointment()
		mockUpdate()

		const result = await service.createAppointment(createInput(), SCHEDULER_STAFF_ID)

		expect(result.id).toBe(APPOINTMENT_ID)
		expect(result.clinicianId).toBe(PHYSICIAN_STAFF_ID)
		expect(result.patientInviteToken).toBeDefined()
		expect(insertChain.values).toHaveBeenCalledWith(
			expect.objectContaining({
				clinicianStaffId: PHYSICIAN_STAFF_ID,
				createdByStaffId: SCHEDULER_STAFF_ID,
			})
		)
	})

	it("rejects when a scheduler does not specify a clinician", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "scheduler-user")],
			[role("role-scheduler", "Scheduler")]
		)

		await expect(
			service.createAppointment(
				createInput({ clinicianId: undefined as unknown as string }),
				SCHEDULER_STAFF_ID
			)
		).rejects.toThrow(
			"Schedulers must assign a physician to telemedicine appointments. Please select a clinician from the dropdown."
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("rejects when a scheduler self-assigns as the treating clinician", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "scheduler-user")],
			[role("role-scheduler", "Scheduler")]
		)

		await expect(
			service.createAppointment(
				createInput({ clinicianId: SCHEDULER_STAFF_ID }),
				SCHEDULER_STAFF_ID
			)
		).rejects.toThrow(
			"Schedulers cannot assign themselves as the treating physician. Please select a different clinician."
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("rejects when a scheduler assigns staff without a physician role", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "scheduler-user")],
			[role("role-scheduler", "Scheduler")],
			[staffProfile(NURSE_STAFF_ID, "nurse-user")],
			[role("role-nurse", "Nurse")]
		)

		await expect(
			service.createAppointment(createInput({ clinicianId: NURSE_STAFF_ID }), SCHEDULER_STAFF_ID)
		).rejects.toThrow(
			"The assigned clinician must have a Physician, Surgeon, or Anesthesiologist role."
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("allows a dual-role scheduler and physician to self-assign", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "dual-role-user")],
			[role("role-scheduler", "Scheduler"), role("role-physician", "Physician")],
			[{ id: PATIENT_ID, facilityId: FACILITY_ID, isActive: true }],
			[{ id: SCHEDULER_STAFF_ID, facilityId: FACILITY_ID, isActive: true }]
		)
		mockInsertAppointment()
		mockUpdate()

		const result = await service.createAppointment(
			createInput({ clinicianId: SCHEDULER_STAFF_ID }),
			SCHEDULER_STAFF_ID
		)

		expect(result.id).toBe(APPOINTMENT_ID)
	})

	it("allows a physician without the scheduler role to self-assign", async () => {
		queueSelectRows(
			[staffProfile(PHYSICIAN_STAFF_ID, "physician-user")],
			[role("role-physician", "Physician")],
			[{ id: PATIENT_ID, facilityId: FACILITY_ID, isActive: true }],
			[{ id: PHYSICIAN_STAFF_ID, facilityId: FACILITY_ID, isActive: true }]
		)
		mockInsertAppointment()
		mockUpdate()

		const result = await service.createAppointment(
			createInput({ clinicianId: PHYSICIAN_STAFF_ID }),
			PHYSICIAN_STAFF_ID
		)

		expect(result.id).toBe(APPOINTMENT_ID)
	})

	it("throws a not found error when the creator staff profile does not exist", async () => {
		queueSelectRows([])

		await expect(service.createAppointment(createInput(), SCHEDULER_STAFF_ID)).rejects.toThrow(
			`Staff profile ${SCHEDULER_STAFF_ID} not found`
		)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("returns BadRequestException for scheduler validation failures", async () => {
		queueSelectRows(
			[staffProfile(SCHEDULER_STAFF_ID, "scheduler-user")],
			[role("role-scheduler", "Scheduler")]
		)

		await expect(
			service.createAppointment(
				createInput({ clinicianId: undefined as unknown as string }),
				SCHEDULER_STAFF_ID
			)
		).rejects.toThrow(BadRequestException)
	})
})
