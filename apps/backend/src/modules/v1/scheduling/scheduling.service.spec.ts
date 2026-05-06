import { BadRequestException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { SchedulingService } from "./scheduling.service"

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		transaction: jest.fn(),
	},
}))

jest.mock("@/utils/sla-events", () => ({
	closeOpenSlaStep: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/utils/sla-step-target", () => ({
	resolveStepTarget: jest.fn().mockResolvedValue(15),
}))

jest.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	eq: (left: unknown, right: unknown) => ({ op: "eq", left, right }),
	gte: (left: unknown, right: unknown) => ({ op: "gte", left, right }),
	count: jest.fn(),
	desc: jest.fn(),
	isNotNull: jest.fn(),
	lt: jest.fn(),
	or: jest.fn(),
	sql: jest.fn(),
}))

jest.mock("@repo/db/schema", () => ({
	clinicTemplates: {
		id: "clinicTemplates.id",
		facilityId: "clinicTemplates.facilityId",
		clinicianStaffId: "clinicTemplates.clinicianStaffId",
		clinicName: "clinicTemplates.clinicName",
		dayOfWeek: "clinicTemplates.dayOfWeek",
		startTime: "clinicTemplates.startTime",
		endTime: "clinicTemplates.endTime",
		maxPatients: "clinicTemplates.maxPatients",
		slotDurationMinutes: "clinicTemplates.slotDurationMinutes",
		isActive: "clinicTemplates.isActive",
		updatedAt: "clinicTemplates.updatedAt",
	},
	clinicSlots: {
		clinicTemplateId: "clinicSlots.clinicTemplateId",
		slotDate: "clinicSlots.slotDate",
		status: "clinicSlots.status",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
		facilityId: "staffProfiles.facilityId",
	},
	appointments: {},
	encounters: {},
	encounterStatusEvents: {},
	patients: {},
	users: {},
}))

const mockAuditService = {
	log: jest.fn().mockResolvedValue(undefined),
}

const mockSlotGenerator = {
	generateSlotsForTemplate: jest.fn().mockResolvedValue({ inserted: 8 }),
}

const actor = {
	userId: "user-1",
	facilityId: "fac-1",
	staffProfileId: "staff-actor-1",
	ipAddress: null,
	userAgent: null,
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
	return {
		id: "template-1",
		facilityId: "fac-1",
		clinicianStaffId: "clinician-1",
		clinicName: "OPD AM",
		dayOfWeek: 1,
		startTime: "08:00",
		endTime: "12:00",
		maxPatients: 20,
		slotDurationMinutes: 15,
		isActive: true,
		createdAt: new Date("2026-05-06T00:00:00.000Z"),
		updatedAt: new Date("2026-05-06T00:00:00.000Z"),
		...overrides,
	}
}

function mockSelectWhere(rows: unknown[]) {
	const result = Promise.resolve(rows) as Promise<unknown[]> & {
		limit: jest.Mock
	}
	result.limit = jest.fn().mockResolvedValue(rows)

	return {
		where: jest.fn().mockReturnValue(result),
	}
}

function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue(mockSelectWhere(rows)),
	}
}

function mockInsertReturning(row: unknown) {
	return {
		values: jest.fn().mockReturnValue({
			returning: jest.fn().mockResolvedValue([row]),
		}),
	}
}

function mockUpdateReturning(row: unknown) {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([row]),
			}),
		}),
	}
}

function mockDeleteChain() {
	return {
		where: jest.fn().mockResolvedValue(undefined),
	}
}

describe("SchedulingService", () => {
	let service: SchedulingService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new SchedulingService(mockAuditService as never, mockSlotGenerator as never)
	})

	describe("createClinicTemplate()", () => {
		it("creates the template and triggers slot generation", async () => {
			const created = makeTemplate()
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([{ id: "clinician-1" }]))
			;(db.transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					insert: jest.fn().mockReturnValue(mockInsertReturning(created)),
				}
				return fn(tx)
			})

			const result = await service.createClinicTemplate(
				{
					facilityId: "fac-1",
					clinicianStaffId: "clinician-1",
					clinicName: "OPD AM",
					dayOfWeek: 1,
					startTime: "08:00",
					endTime: "12:00",
					maxPatients: 20,
					slotDurationMinutes: 15,
				},
				actor
			)

			expect(result.id).toBe(created.id)
			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenCalledTimes(1)
			expect(mockAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "create",
					entityId: created.id,
					metadata: expect.objectContaining({
						event: "audit.scheduling.template.create",
						templateId: created.id,
						actorStaffId: actor.staffProfileId,
					}),
				}),
				expect.any(Object)
			)
		})

		it("throws BadRequestException when endTime is not later than startTime", async () => {
			await expect(
				service.createClinicTemplate(
					{
						facilityId: "fac-1",
						clinicianStaffId: "clinician-1",
						clinicName: "OPD AM",
						dayOfWeek: 1,
						startTime: "10:00",
						endTime: "10:00",
						maxPatients: 20,
						slotDurationMinutes: 15,
					},
					actor
				)
			).rejects.toThrow(BadRequestException)
		})

		it("throws BadRequestException when slot duration is invalid", async () => {
			await expect(
				service.createClinicTemplate(
					{
						facilityId: "fac-1",
						clinicianStaffId: "clinician-1",
						clinicName: "OPD AM",
						dayOfWeek: 1,
						startTime: "08:00",
						endTime: "12:00",
						maxPatients: 20,
						slotDurationMinutes: 7 as never,
					},
					actor
				)
			).rejects.toThrow(BadRequestException)
		})

		it("throws BadRequestException when clinician does not belong to facility", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(
				service.createClinicTemplate(
					{
						facilityId: "fac-1",
						clinicianStaffId: "clinician-2",
						clinicName: "OPD AM",
						dayOfWeek: 1,
						startTime: "08:00",
						endTime: "12:00",
						maxPatients: 20,
						slotDurationMinutes: 15,
					},
					actor
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe("updateClinicTemplate()", () => {
		it("drops future open slots and regenerates when startTime changes", async () => {
			const existing = makeTemplate()
			const updated = makeTemplate({ startTime: "09:00", updatedAt: new Date("2026-05-07T00:00:00.000Z") })
			const deleteChain = mockDeleteChain()

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
					delete: jest.fn().mockReturnValue(deleteChain),
				}
				return fn(tx)
			})

			const result = await service.updateClinicTemplate(
				{
					id: existing.id,
					startTime: "09:00",
				},
				actor
			)

			expect(result.startTime).toBe("09:00")
			expect(deleteChain.where).toHaveBeenCalledTimes(1)
			expect(deleteChain.where).toHaveBeenCalledWith(
				expect.objectContaining({
					op: "and",
					args: expect.arrayContaining([
						expect.objectContaining({
							op: "eq",
							left: "clinicSlots.status",
							right: "open",
						}),
					]),
				})
			)
			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenCalledTimes(1)
			expect(mockAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "update",
					entityId: existing.id,
					metadata: expect.objectContaining({
						event: "audit.scheduling.template.update",
						templateId: existing.id,
						actorStaffId: actor.staffProfileId,
						changes: expect.arrayContaining([
							expect.objectContaining({
								path: "startTime",
								before: "08:00",
								after: "09:00",
							}),
						]),
					}),
				}),
				expect.any(Object)
			)
		})

		it("regenerates when an inactive template is reactivated", async () => {
			const existing = makeTemplate({ isActive: false })
			const updated = makeTemplate({ isActive: true })

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
					delete: jest.fn().mockReturnValue(mockDeleteChain()),
				}
				return fn(tx)
			})

			await service.updateClinicTemplate(
				{
					id: existing.id,
					isActive: true,
				},
				actor
			)

			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenCalledTimes(1)
		})

		it("throws NotFoundException when the template does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(service.updateClinicTemplate({ id: "missing-template" }, actor)).rejects.toThrow(
				NotFoundException
			)
		})
	})
})
