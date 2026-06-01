import { db } from "@/common/database/database.client"

import { TelemedicineService } from "./telemedicine.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
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
	telemedicineAppointments: {},
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
const STAFF_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440002"
const ENTITY_ID = "550e8400-e29b-41d4-a716-446655440003"

type WriteTelemedicineAuditInput = {
	facilityId: string
	staffProfileId: string | null
	userId?: string | null
	action: "create" | "read" | "update" | "delete" | "sign" | "verify" | "override"
	entityType: string
	entityId: string
	beforeState?: Record<string, unknown> | null
	afterState?: Record<string, unknown> | null
	metadata?: Record<string, unknown> | null
	severity?: "info" | "warning" | "critical"
	outcome?: "success" | "failure"
}

function staffProfile(userId: string) {
	return {
		id: STAFF_PROFILE_ID,
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

function baseAuditInput(overrides: Partial<WriteTelemedicineAuditInput> = {}) {
	return {
		facilityId: FACILITY_ID,
		staffProfileId: STAFF_PROFILE_ID,
		action: "create",
		entityType: "telemedicine_appointment",
		entityId: ENTITY_ID,
		metadata: { patientId: "patient-1", platform: "livekit" },
		...overrides,
	} satisfies WriteTelemedicineAuditInput
}

describe("TelemedicineService - Enhanced Audit Logging", () => {
	let service: TelemedicineService
	let auditService: { log: jest.Mock }
	let writeTelemedicineAudit: (input: WriteTelemedicineAuditInput) => Promise<void>

	beforeEach(() => {
		jest.clearAllMocks()

		auditService = { log: jest.fn().mockResolvedValue(undefined) }
		const mailerService = {
			isConfigured: jest.fn(() => false),
			send: jest.fn().mockResolvedValue({ delivered: false, messageId: null, transport: "log" }),
		}

		service = new TelemedicineService(
			{} as never,
			{} as never,
			auditService as never,
			mailerService as never
		)
		writeTelemedicineAudit = (
			service as unknown as {
				writeTelemedicineAudit(input: WriteTelemedicineAuditInput): Promise<void>
			}
		).writeTelemedicineAudit.bind(service)
	})

	it("includes scheduler role context in telemedicine audit metadata", async () => {
		queueSelectRows([staffProfile("scheduler-user")], [role("role-scheduler", "Scheduler")])

		await writeTelemedicineAudit(baseAuditInput())

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "scheduler-user",
				action: "create",
				entityType: "telemedicine_appointment",
				metadata: expect.objectContaining({
					patientId: "patient-1",
					platform: "livekit",
					userRoles: ["Scheduler"],
					isSchedulerAction: true,
					isPhysicianAction: false,
				}),
			})
		)
	})

	it("includes physician role context in clinical telemedicine audit metadata", async () => {
		queueSelectRows([staffProfile("physician-user")], [role("role-physician", "Physician")])

		await writeTelemedicineAudit(
			baseAuditInput({
				action: "sign",
				entityType: "telemedicine_prescription",
				metadata: { prescriptionId: "rx-1" },
			})
		)

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "physician-user",
				action: "sign",
				entityType: "telemedicine_prescription",
				metadata: expect.objectContaining({
					prescriptionId: "rx-1",
					userRoles: ["Physician"],
					isSchedulerAction: false,
					isPhysicianAction: true,
				}),
			})
		)
	})

	it("marks dual-role users as both scheduler and physician actions", async () => {
		queueSelectRows(
			[staffProfile("dual-role-user")],
			[role("role-scheduler", "Scheduler"), role("role-physician", "Physician")]
		)

		await writeTelemedicineAudit(baseAuditInput())

		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "dual-role-user",
				metadata: expect.objectContaining({
					userRoles: ["Scheduler", "Physician"],
					isSchedulerAction: true,
					isPhysicianAction: true,
				}),
			})
		)
	})

	it("uses anonymous audit user and preserves metadata when no staff profile is provided", async () => {
		await writeTelemedicineAudit(
			baseAuditInput({
				staffProfileId: null,
				metadata: { tokenFlow: "patient_invite" },
			})
		)

		expect(db.select).not.toHaveBeenCalled()
		expect(auditService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "telemedicine:anonymous",
				staffProfileId: null,
				metadata: { tokenFlow: "patient_invite" },
			})
		)
	})

	it("does not fail the caller when audit logging fails", async () => {
		queueSelectRows([staffProfile("scheduler-user")], [role("role-scheduler", "Scheduler")])
		auditService.log.mockRejectedValueOnce(new Error("Audit DB down"))

		await expect(writeTelemedicineAudit(baseAuditInput())).resolves.toBeUndefined()
	})
})
