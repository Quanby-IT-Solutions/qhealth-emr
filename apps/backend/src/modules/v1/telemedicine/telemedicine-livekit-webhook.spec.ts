import { ForbiddenException } from "@nestjs/common"

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
	facilities: {},
	patients: {},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
	},
	telemedicineAbstracts: {},
	telemedicineAppointments: {
		id: "telemedicineAppointments.id",
		facilityId: "telemedicineAppointments.facilityId",
		clinicianStaffId: "telemedicineAppointments.clinicianStaffId",
		livekitSessionStartedAt: "telemedicineAppointments.livekitSessionStartedAt",
		livekitSessionEndedAt: "telemedicineAppointments.livekitSessionEndedAt",
		patientJoinedAt: "telemedicineAppointments.patientJoinedAt",
		updatedAt: "telemedicineAppointments.updatedAt",
	},
	telemedicineEncounters: {},
	telemedicinePrescriptionItems: {},
	telemedicinePrescriptions: {},
	users: {},
}))

const NOW = new Date("2026-05-19T05:00:00.000Z")
const APPOINTMENT_ID = "550e8400-e29b-41d4-a716-446655440000"
const ROOM_NAME = `telemed-${APPOINTMENT_ID}`

function makeSelectRowsChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.where = jest.fn(() => chain)
	chain.limit = jest.fn().mockResolvedValue(rows)
	return chain
}

function mockUpdateChain() {
	const chain: Record<string, jest.Mock> = {}
	chain.set = jest.fn(() => chain)
	chain.where = jest.fn().mockResolvedValue(undefined)
	;(db.update as jest.Mock).mockReturnValue(chain)
	return chain
}

function mockSelects(appointmentRow: unknown, clinicianRow: unknown) {
	;(db.select as jest.Mock)
		.mockImplementationOnce(() => makeSelectRowsChain([appointmentRow]))
		.mockImplementationOnce(() => makeSelectRowsChain([clinicianRow]))
}

function makeAppointment(overrides: Record<string, unknown> = {}) {
	return {
		id: APPOINTMENT_ID,
		facilityId: "facility-1",
		clinicianStaffId: "staff-1",
		livekitSessionStartedAt: null,
		livekitSessionEndedAt: null,
		patientJoinedAt: null,
		...overrides,
	}
}

function makeClinicianRow() {
	return { userId: "user-1" }
}

describe("TelemedicineService.handleLiveKitWebhook", () => {
	let service: TelemedicineService
	let liveKitService: { verifyWebhook: jest.Mock }
	let auditService: { log: jest.Mock }

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
		jest.setSystemTime(NOW)

		liveKitService = { verifyWebhook: jest.fn() }
		auditService = { log: jest.fn().mockResolvedValue(undefined) }
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

	it("rejects webhooks with invalid signatures", async () => {
		liveKitService.verifyWebhook.mockRejectedValueOnce(new Error("bad sig"))

		await expect(service.handleLiveKitWebhook("{}", "Bearer x")).rejects.toThrow(ForbiddenException)
		expect(db.select).not.toHaveBeenCalled()
		expect(db.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("ignores events for rooms that are not telemedicine rooms", async () => {
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "participant_joined",
			room: { name: "other-room" },
			participant: { identity: "clinician:staff-1", name: "Dr.", sid: "p1" },
			id: "evt-1",
			createdAt: 0n,
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(db.select).not.toHaveBeenCalled()
		expect(db.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("ignores events when the appointment cannot be found", async () => {
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "participant_joined",
			room: { name: ROOM_NAME },
			participant: { identity: "clinician:staff-1", name: "Dr.", sid: "p1" },
			id: "evt-2",
			createdAt: 0n,
		})
		;(db.select as jest.Mock).mockImplementationOnce(() => makeSelectRowsChain([]))

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(db.update).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalled()
	})

	it("starts the session on the first participant_joined and audits the event", async () => {
		const updateChain = mockUpdateChain()
		mockSelects(makeAppointment(), makeClinicianRow())
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "participant_joined",
			room: { name: ROOM_NAME },
			participant: { identity: "clinician:staff-1", name: "Dr. Reyes", sid: "p1" },
			id: "evt-3",
			createdAt: BigInt(Math.floor(NOW.getTime() / 1000)),
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({ livekitSessionStartedAt: NOW })
		)
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				facilityId: "facility-1",
				userId: "user-1",
				staffProfileId: "staff-1",
				action: "update",
				entityType: "telemedicine_appointment_session",
				entityId: APPOINTMENT_ID,
				metadata: expect.objectContaining({
					liveKitEvent: "participant_joined",
					participantRole: "clinician",
				}),
			})
		)
	})

	it("records the patient join timestamp on patient participant_joined", async () => {
		const updateChain = mockUpdateChain()
		mockSelects(
			makeAppointment({ livekitSessionStartedAt: new Date("2026-05-19T04:50:00.000Z") }),
			makeClinicianRow()
		)
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "participant_joined",
			room: { name: ROOM_NAME },
			participant: { identity: `patient:${APPOINTMENT_ID}`, name: "Juan", sid: "p2" },
			id: "evt-4",
			createdAt: BigInt(Math.floor(NOW.getTime() / 1000)),
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		const setCall = (updateChain.set as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>
		expect(setCall).toMatchObject({ patientJoinedAt: NOW })
		expect(setCall).not.toHaveProperty("livekitSessionStartedAt")
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ participantRole: "patient" }),
			})
		)
	})

	it("writes livekitSessionEndedAt on room_finished and audits the event", async () => {
		const updateChain = mockUpdateChain()
		mockSelects(
			makeAppointment({ livekitSessionStartedAt: new Date("2026-05-19T04:50:00.000Z") }),
			makeClinicianRow()
		)
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "room_finished",
			room: { name: ROOM_NAME },
			id: "evt-5",
			createdAt: BigInt(Math.floor(NOW.getTime() / 1000)),
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({ livekitSessionEndedAt: NOW })
		)
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ liveKitEvent: "room_finished" }),
			})
		)
	})

	it("does not overwrite existing livekitSessionEndedAt", async () => {
		const updateChain = mockUpdateChain()
		mockSelects(
			makeAppointment({
				livekitSessionStartedAt: new Date("2026-05-19T04:50:00.000Z"),
				livekitSessionEndedAt: new Date("2026-05-19T04:58:00.000Z"),
			}),
			makeClinicianRow()
		)
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "room_finished",
			room: { name: ROOM_NAME },
			id: "evt-6",
			createdAt: BigInt(Math.floor(NOW.getTime() / 1000)),
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(updateChain.set).not.toHaveBeenCalled()
		expect(auditService.log).toHaveBeenCalled()
	})

	it("audits participant_left without touching the appointment row", async () => {
		mockUpdateChain()
		mockSelects(
			makeAppointment({ livekitSessionStartedAt: new Date("2026-05-19T04:50:00.000Z") }),
			makeClinicianRow()
		)
		liveKitService.verifyWebhook.mockResolvedValueOnce({
			event: "participant_left",
			room: { name: ROOM_NAME },
			participant: { identity: `patient:${APPOINTMENT_ID}`, name: "Juan", sid: "p2" },
			id: "evt-7",
			createdAt: BigInt(Math.floor(NOW.getTime() / 1000)),
		})

		await service.handleLiveKitWebhook("{}", "Bearer x")

		expect(db.update).not.toHaveBeenCalled()
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ liveKitEvent: "participant_left" }),
			})
		)
	})
})
