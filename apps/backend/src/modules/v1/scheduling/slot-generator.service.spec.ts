import { db } from "@/common/database/database.client"

import { SlotGeneratorService } from "./slot-generator.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
	},
}))

jest.mock("@nestjs/schedule", () => ({
	Cron: () => () => {},
}))

jest.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	eq: (left: unknown, right: unknown) => ({ op: "eq", left, right }),
}))

jest.mock("@repo/db/schema", () => ({
	clinicTemplates: {
		id: "clinicTemplates.id",
		isActive: "clinicTemplates.isActive",
	},
	clinicSlots: {
		$inferInsert: {},
	},
}))

function makeTemplate(overrides: Record<string, unknown> = {}) {
	return {
		id: "template-1",
		facilityId: "fac-1",
		clinicianStaffId: "clinician-1",
		clinicName: "Monday AM",
		dayOfWeek: 1,
		startTime: "08:00",
		endTime: "10:00",
		maxPatients: 10,
		slotDurationMinutes: 30,
		isActive: true,
		createdAt: new Date("2026-05-01T00:00:00.000Z"),
		updatedAt: new Date("2026-05-01T00:00:00.000Z"),
		...overrides,
	}
}

function mockSelectTemplate(rows: unknown[]) {
	const result = Promise.resolve(rows) as Promise<unknown[]> & { limit: jest.Mock }
	result.limit = jest.fn().mockResolvedValue(rows)

	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue(result),
		}),
	}
}

function mockSelectTemplates(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(rows),
		}),
	}
}

function mockInsert(rowCount: number) {
	const onConflictDoNothing = jest.fn().mockResolvedValue({ rowCount })
	const values = jest.fn().mockReturnValue({ onConflictDoNothing })
	;(db.insert as jest.Mock).mockReturnValue({ values })
	return { values, onConflictDoNothing }
}

function mockInsertOnce(rowCount: number) {
	const onConflictDoNothing = jest.fn().mockResolvedValue({ rowCount })
	const values = jest.fn().mockReturnValue({ onConflictDoNothing })
	;(db.insert as jest.Mock).mockReturnValueOnce({ values })
	return { values, onConflictDoNothing }
}

describe("SlotGeneratorService", () => {
	let service: SlotGeneratorService

	beforeEach(() => {
		jest.clearAllMocks()
		process.env.SCHEDULER_SLOT_WINDOW_DAYS = "60"
		service = new SlotGeneratorService()
	})

	afterEach(() => {
		delete process.env.SCHEDULER_SLOT_WINDOW_DAYS
	})

	it("generates 4 slots for a matching Monday template window", async () => {
		const template = makeTemplate()
		;(db.select as jest.Mock).mockReturnValueOnce(mockSelectTemplate([template]))
		const { values } = mockInsert(4)

		const result = await service.generateSlotsForTemplate(template.id, "2026-05-04", "2026-05-04")

		expect(result.inserted).toBe(4)
		expect(values).toHaveBeenCalledTimes(1)
		expect(values).toHaveBeenCalledWith([
			expect.objectContaining({
				slotDate: "2026-05-04",
				slotStartTime: "08:00",
				slotEndTime: "08:30",
			}),
			expect.objectContaining({
				slotDate: "2026-05-04",
				slotStartTime: "08:30",
				slotEndTime: "09:00",
			}),
			expect.objectContaining({
				slotDate: "2026-05-04",
				slotStartTime: "09:00",
				slotEndTime: "09:30",
			}),
			expect.objectContaining({
				slotDate: "2026-05-04",
				slotStartTime: "09:30",
				slotEndTime: "10:00",
			}),
		])
	})

	it("is idempotent when the same range is generated twice", async () => {
		const template = makeTemplate()
		;(db.select as jest.Mock)
			.mockReturnValueOnce(mockSelectTemplate([template]))
			.mockReturnValueOnce(mockSelectTemplate([template]))
		mockInsertOnce(4)
		const secondInsert = mockInsert(0)

		const first = await service.generateSlotsForTemplate(template.id, "2026-05-04", "2026-05-04")
		const second = await service.generateSlotsForTemplate(template.id, "2026-05-04", "2026-05-04")

		expect(first.inserted).toBe(4)
		expect(second.inserted).toBe(0)
		expect(secondInsert.onConflictDoNothing).toHaveBeenCalledTimes(1)
	})

	it("returns 0 for inactive templates", async () => {
		;(db.select as jest.Mock).mockReturnValueOnce(mockSelectTemplate([]))

		const result = await service.generateSlotsForTemplate(
			"template-inactive",
			"2026-05-04",
			"2026-05-04"
		)

		expect(result.inserted).toBe(0)
		expect(db.insert).not.toHaveBeenCalled()
	})

	it("does not duplicate an existing booked slot and leaves overlap untouched", async () => {
		const template = makeTemplate()
		;(db.select as jest.Mock).mockReturnValueOnce(mockSelectTemplate([template]))
		const { values } = mockInsert(3)

		const result = await service.generateSlotsForTemplate(template.id, "2026-05-04", "2026-05-04")

		expect(result.inserted).toBe(3)
		const insertedRows = values.mock.calls[0]![0] as Array<Record<string, unknown>>
		expect(insertedRows).toHaveLength(4)
		expect(insertedRows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					slotStartTime: "08:30",
					slotEndTime: "09:00",
					status: "open",
				}),
			])
		)
	})

	it("generates the rolling window across all active templates", async () => {
		const templates = [
			makeTemplate({ id: "template-1" }),
			makeTemplate({ id: "template-2", clinicianStaffId: "clinician-2" }),
		]
		;(db.select as jest.Mock)
			.mockReturnValueOnce(mockSelectTemplates(templates))
			.mockReturnValueOnce(mockSelectTemplate([templates[0]]))
			.mockReturnValueOnce(mockSelectTemplate([templates[1]]))
		mockInsert(4)
		mockInsert(4)

		const result = await service.generateRollingWindow()

		expect(result.templates).toBe(2)
		expect(result.inserted).toBe(8)
	})
})
