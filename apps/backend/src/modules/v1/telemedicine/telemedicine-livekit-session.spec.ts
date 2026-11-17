import { BadRequestException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { TelemedicineService } from "./telemedicine.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
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
	facilities: {
		id: "facilities.id",
		name: "facilities.name",
	},
	patients: {
		id: "patients.id",
		firstName: "patients.firstName",
		lastName: "patients.lastName",
		mrn: "patients.mrn",
		dateOfBirth: "patients.dateOfBirth",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
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
		status: "telemedicineAppointments.status",
		livekitRoomName: "telemedicineAppointments.livekitRoomName",
		livekitSessionStartedAt: "telemedicineAppointments.livekitSessionStartedAt",
		livekitSessionEndedAt: "telemedicineAppointments.livekitSessionEndedAt",
		patientInviteTokenHash: "telemedicineAppointments.patientInviteTokenHash",
		patientInviteExpiresAt: "telemedicineAppointments.patientInviteExpiresAt",
		patientInviteRevokedAt: "telemedicineAppointments.patientInviteRevokedAt",
		patientInviteLastUsedAt: "telemedicineAppointments.patientInviteLastUsedAt",
		patientJoinedAt: "telemedicineAppointments.patientJoinedAt",
		updatedAt: "telemedicineAppointments.updatedAt",
	},
	telemedicineEncounters: {},
	telemedicinePrescriptionItems: {},
	telemedicinePrescriptions: {},
	users: {
		id: "users.id",
		name: "users.name",
	},
}))

const NOW = new Date("2026-05-19T02:00:00.000Z")

function makeSubqueryChain() {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
	chain.as = jest.fn(() => ({ alias: "clinician_staff" }))
	return chain
}

function makeSelectRowsChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
	chain.leftJoin = jest.fn(() => chain)
	chain.where = jest.fn(() => chain)
	chain.limit = jest.fn().mockResolvedValue(rows)
	return chain
}

function mockAppointmentSelect(row: unknown) {
	;(db.select as jest.Mock)
		.mockImplementationOnce(() => makeSubqueryChain())
		.mockImplementationOnce(() => makeSelectRowsChain([row]))
}

function mockDirectAppointmentSelect(row: unknown) {
	;(db.select as jest.Mock).mockImplementationOnce(() => makeSelectRowsChain([row]))
}

function mockUpdateChain() {
	const chain: Record<string, jest.Mock> = {}
	chain.set = jest.fn(() => chain)
	chain.where = jest.fn().mockResolvedValue(undefined)
	;(db.update as jest.Mock).mockReturnValue(chain)
	return chain
}

function makeClinicianAppointment(overrides: Record<string, unknown> = {}) {
	return {
		id: "appt-1",
		facilityId: "fac-1",
		clinicianStaffId: "staff-1",
		scheduledDate: "2026-05-19",
		scheduledTime: "10:00:00",
		durationMinutes: 30,
		status: "scheduled",
		livekitRoomName: null,
		livekitSessionStartedAt: null,
		livekitSessionEndedAt: null,
		clinicianName: "Dr. Reyes",
		...overrides,
	}
}

function makePatientAppointment(overrides: Record<string, unknown> = {}) {
	return {
		...makeClinicianAppointment(),
		patientId: "patient-1",
		patientInviteExpiresAt: new Date("2026-05-19T04:30:00.000Z"),
		patientInviteRevokedAt: null,
		patientJoinedAt: null,
		patientFirstName: "Juan",
		patientLastName: "Dela Cruz",
		patientMrn: "MRN-001",
		patientDateOfBirth: "1990-01-01",
		facilityName: "JuanMeds Test",
		...overrides,
	}
}

describe("TelemedicineService LiveKit session lifecycle", () => {
	let service: TelemedicineService
	let liveKitService: {
		isConfigured: jest.Mock
		getRoomName: jest.Mock
		generateToken: jest.Mock
	}

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
		jest.setSystemTime(NOW)

		liveKitService = {
			isConfigured: jest.fn(() => true),
			getRoomName: jest.fn((appointmentId: string) => `telemed-${appointmentId}`),
			generateToken: jest.fn().mockResolvedValue("livekit-token"),
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
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it("sets the clinician join start timestamp and moves confirmed appointments in-progress", async () => {
		const updateChain = mockUpdateChain()
		mockAppointmentSelect(makeClinicianAppointment({ status: "confirmed" }))

		const result = await service.joinClinicianLiveKitRoom("appt-1", "staff-1")

		expect(result).toEqual({
			isConfigured: true,
			token: "livekit-token",
			wsUrl: "wss://livekit.example.test",
			roomName: "telemed-appt-1",
		})
		expect(updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({
				livekitRoomName: "telemed-appt-1",
				livekitSessionStartedAt: NOW,
				status: "in-progress",
				updatedAt: NOW,
			})
		)
	})

	it("sets patient join timestamps and moves scheduled appointments in-progress", async () => {
		const updateChain = mockUpdateChain()
		mockAppointmentSelect(makePatientAppointment({ status: "scheduled" }))

		const result = await service.joinPatientLiveKitRoom({
			token: "patient-invite-token",
			dateOfBirth: "1990-01-01",
		})

		expect(result).toEqual({
			isConfigured: true,
			token: "livekit-token",
			wsUrl: "wss://livekit.example.test",
			roomName: "telemed-appt-1",
		})
		expect(updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({
				patientInviteLastUsedAt: NOW,
				patientJoinedAt: NOW,
				livekitRoomName: "telemed-appt-1",
				livekitSessionStartedAt: NOW,
				status: "in-progress",
				updatedAt: NOW,
			})
		)
	})

	it("keeps already in-progress appointment status unchanged on rejoin", async () => {
		const updateChain = mockUpdateChain()
		mockAppointmentSelect(makeClinicianAppointment({ status: "in-progress" }))

		await service.joinClinicianLiveKitRoom("appt-1", "staff-1")

		const updatePayload = (updateChain.set as jest.Mock).mock.calls[0]?.[0] as Record<
			string,
			unknown
		>
		expect(updatePayload).toMatchObject({
			livekitRoomName: "telemed-appt-1",
			livekitSessionStartedAt: NOW,
			updatedAt: NOW,
		})
		expect(updatePayload).not.toHaveProperty("status")
	})

	it("writes a LiveKit end timestamp without completing the appointment", async () => {
		const updateChain = mockUpdateChain()
		mockDirectAppointmentSelect(
			makeClinicianAppointment({
				status: "in-progress",
				livekitSessionStartedAt: new Date("2026-05-19T01:59:00.000Z"),
			})
		)

		const result = await service.endClinicianLiveKitSession("appt-1", "staff-1")

		expect(result).toEqual({
			appointmentId: "appt-1",
			livekitSessionEndedAt: NOW.toISOString(),
		})
		expect(updateChain.set).toHaveBeenCalledWith({
			livekitSessionEndedAt: NOW,
			updatedAt: NOW,
		})
	})

	it("returns the existing LiveKit end timestamp without rewriting it", async () => {
		const existingEndedAt = new Date("2026-05-19T02:05:00.000Z")
		mockUpdateChain()
		mockDirectAppointmentSelect(
			makeClinicianAppointment({
				status: "completed",
				livekitSessionStartedAt: new Date("2026-05-19T01:59:00.000Z"),
				livekitSessionEndedAt: existingEndedAt,
			})
		)

		const result = await service.endClinicianLiveKitSession("appt-1", "staff-1")

		expect(result).toEqual({
			appointmentId: "appt-1",
			livekitSessionEndedAt: existingEndedAt.toISOString(),
		})
		expect(db.update).not.toHaveBeenCalled()
	})

	it("blocks ending a LiveKit session that is not in progress", async () => {
		mockUpdateChain()
		mockDirectAppointmentSelect(
			makeClinicianAppointment({
				status: "scheduled",
				livekitSessionStartedAt: new Date("2026-05-19T01:59:00.000Z"),
			})
		)

		await expect(service.endClinicianLiveKitSession("appt-1", "staff-1")).rejects.toThrow(
			BadRequestException
		)
		expect(db.update).not.toHaveBeenCalled()
	})

	it.each(["cancelled", "completed", "no-show"] as const)(
		"blocks clinician LiveKit joins for %s appointments",
		async status => {
			mockUpdateChain()
			mockAppointmentSelect(makeClinicianAppointment({ status }))

			await expect(service.joinClinicianLiveKitRoom("appt-1", "staff-1")).rejects.toThrow(
				BadRequestException
			)
			expect(liveKitService.generateToken).not.toHaveBeenCalled()
			expect(db.update).not.toHaveBeenCalled()
		}
	)
})
