import { db } from "@/common/database/database.client"

import { EncountersService } from "./encounters.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
	},
}))

jest.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	count: jest.fn(),
	desc: (value: unknown) => ({ op: "desc", value }),
	eq: (left: unknown, right: unknown) => ({ op: "eq", left, right }),
	gte: jest.fn(),
	inArray: jest.fn(),
	isNull: jest.fn(),
	lt: jest.fn(),
	max: jest.fn(),
	sql: jest.fn(),
}))

jest.mock("@repo/contracts", () => ({
	SLA_STEP_DEFAULT_TARGETS: {},
}))

jest.mock("@repo/db/schema", () => ({
	encounters: {
		id: "encounters.id",
		linkedEncounterId: "encounters.linkedEncounterId",
		encounterType: "encounters.encounterType",
		status: "encounters.status",
		admissionDatetime: "encounters.admissionDatetime",
		dischargeDatetime: "encounters.dischargeDatetime",
		attendingStaffId: "encounters.attendingStaffId",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
	},
	telemedicineAppointments: {
		id: "telemedicineAppointments.id",
	},
	telemedicineEncounters: {
		id: "telemedicineEncounters.id",
		appointmentId: "telemedicineEncounters.appointmentId",
		linkedEncounterId: "telemedicineEncounters.linkedEncounterId",
		status: "telemedicineEncounters.status",
		createdAt: "telemedicineEncounters.createdAt",
		chiefComplaint: "telemedicineEncounters.chiefComplaint",
		diagnosis: "telemedicineEncounters.diagnosis",
		clinicianStaffId: "telemedicineEncounters.clinicianStaffId",
	},
	users: {
		id: "users.id",
		name: "users.name",
	},
}))

const SOURCE_ID = "550e8400-e29b-41d4-a716-446655440000"
const TELE_ID = "550e8400-e29b-41d4-a716-446655440001"
const APPOINTMENT_ID = "550e8400-e29b-41d4-a716-446655440002"

function makeSelectRowsChain(rows: unknown[]) {
	const chain: Record<string, jest.Mock> = {}
	chain.from = jest.fn(() => chain)
	chain.innerJoin = jest.fn(() => chain)
	chain.leftJoin = jest.fn(() => chain)
	chain.where = jest.fn(() => chain)
	chain.orderBy = jest.fn(() => Promise.resolve(rows))
	chain.as = jest.fn(() => ({ id: "alias.id", name: "alias.name" }))
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

describe("EncountersService.getLinked", () => {
	it("returns telemedicine follow-ups linked to a core encounter", async () => {
		queueSelectRows(
			[{ id: SOURCE_ID }],
			[],
			[],
			[],
			[
				{
					id: TELE_ID,
					appointmentId: APPOINTMENT_ID,
					status: "signed",
					createdAt: new Date("2026-05-18T08:00:00.000Z"),
					chiefComplaint: "Follow-up",
					diagnosis: "Improving",
					clinicianName: "Dr. Reyes",
				},
			]
		)
		const service = new EncountersService({} as never, {} as never, {} as never, {} as never)

		const result = await service.getLinked({ id: SOURCE_ID })

		expect(result.linkedEncounters).toEqual([
			expect.objectContaining({
				id: TELE_ID,
				source: "telemedicine",
				appointmentId: APPOINTMENT_ID,
				encounterType: "telemedicine",
				status: "active",
				chiefComplaint: "Follow-up",
				diagnosis: "Improving",
				clinicianName: "Dr. Reyes",
			}),
		])
	})
})
