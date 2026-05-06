import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

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
		id: "clinicSlots.id",
		clinicTemplateId: "clinicSlots.clinicTemplateId",
		slotDate: "clinicSlots.slotDate",
		slotStartTime: "clinicSlots.slotStartTime",
		status: "clinicSlots.status",
		facilityId: "clinicSlots.facilityId",
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

function makeSlot(overrides: Record<string, unknown> = {}) {
	return {
		id: "slot-1",
		clinicTemplateId: "template-1",
		facilityId: "fac-1",
		clinicianStaffId: "clinician-1",
		slotDate: "2026-05-07",
		slotStartTime: "08:00",
		slotEndTime: "08:15",
		status: "open",
		blockReason: null,
		appointmentId: null,
		blockedByStaffId: null,
		blockedAt: null,
		createdAt: new Date("2026-05-06T00:00:00.000Z"),
		updatedAt: new Date("2026-05-06T00:00:00.000Z"),
		...overrides,
	}
}

function mockSelectWhere(rows: unknown[]) {
	const result = Promise.resolve(rows) as Promise<unknown[]> & {
		limit: jest.Mock
		orderBy: jest.Mock
	}
	result.limit = jest.fn().mockResolvedValue(rows)
	result.orderBy = jest.fn().mockResolvedValue(rows)

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

	describe("listTemplateSlots()", () => {
		it("returns slots and lazily generates when requested range exceeds materialized window", async () => {
			const slot = makeSlot()
			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([{ latestSlotDate: "2026-05-08" }]))
				.mockReturnValueOnce(mockSelectChain([slot]))

			const result = await service.listTemplateSlots({
				id: "template-1",
				fromDate: "2026-05-07",
				toDate: "2026-05-12",
			})

			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenCalledWith(
				"template-1",
				"2026-05-07",
				"2026-05-12"
			)
			expect(result).toEqual([slot])
		})
	})

	describe("updateSlot()", () => {
		it("blocks an open slot", async () => {
			const existing = makeSlot()
			const updated = makeSlot({
				status: "blocked",
				blockReason: "Holiday",
				blockedByStaffId: actor.staffProfileId,
				blockedAt: new Date("2026-05-06T10:00:00.000Z"),
			})

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
				}
				return fn(tx)
			})

			const result = await service.updateSlot(
				{ id: existing.id, action: "block", reason: "Holiday" },
				actor
			)

			expect(result.status).toBe("blocked")
			expect(mockAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					entityId: existing.id,
					metadata: expect.objectContaining({
						event: "audit.scheduling.slot.block",
						slotId: existing.id,
						actorStaffId: actor.staffProfileId,
					}),
				}),
				expect.any(Object)
			)
		})

		it("unblocks a blocked slot", async () => {
			const existing = makeSlot({
				status: "blocked",
				blockReason: "Leave",
				blockedByStaffId: "staff-2",
				blockedAt: new Date("2026-05-06T10:00:00.000Z"),
			})
			const updated = makeSlot({
				status: "open",
				blockReason: null,
				blockedByStaffId: null,
				blockedAt: null,
			})

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
				const tx = {
					update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
				}
				return fn(tx)
			})

			const result = await service.updateSlot({ id: existing.id, action: "unblock" }, actor)

			expect(result.status).toBe("open")
			expect(mockAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						event: "audit.scheduling.slot.unblock",
					}),
				}),
				expect.any(Object)
			)
		})

		it("throws ConflictException when blocking a booked slot", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(
				mockSelectChain([makeSlot({ status: "booked", appointmentId: "appt-1" })])
			)

			await expect(
				service.updateSlot({ id: "slot-1", action: "block", reason: "Holiday" }, actor)
			).rejects.toThrow(ConflictException)
		})

		it("returns the current row when unblocking an open slot", async () => {
			const existing = makeSlot({ status: "open" })
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))

			const result = await service.updateSlot({ id: existing.id, action: "unblock" }, actor)

			expect(result).toEqual(existing)
			expect(db.transaction).not.toHaveBeenCalled()
		})

		it("throws NotFoundException when the slot does not exist", async () => {
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([]))

			await expect(service.updateSlot({ id: "missing-slot", action: "block" }, actor)).rejects.toThrow(
				NotFoundException
			)
		})
	})

	describe("slot management integration flow", () => {
		it("creates a template, lists generated slots, blocks one slot, and returns the updated status", async () => {
			const createdTemplate = makeTemplate()
			const openSlot = makeSlot()
			const blockedSlot = makeSlot({
				status: "blocked",
				blockReason: "Clinician leave",
				blockedByStaffId: actor.staffProfileId,
				blockedAt: new Date("2026-05-06T10:00:00.000Z"),
			})

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([{ id: "clinician-1" }]))
				.mockReturnValueOnce(mockSelectChain([{ latestSlotDate: null }]))
				.mockReturnValueOnce(mockSelectChain([openSlot]))
				.mockReturnValueOnce(mockSelectChain([openSlot]))
				.mockReturnValueOnce(mockSelectChain([{ latestSlotDate: "2026-05-12" }]))
				.mockReturnValueOnce(mockSelectChain([blockedSlot]))

			;(db.transaction as jest.Mock)
				.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						insert: jest.fn().mockReturnValue(mockInsertReturning(createdTemplate)),
					}
					return fn(tx)
				})
				.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue(mockUpdateReturning(blockedSlot)),
					}
					return fn(tx)
				})

			await service.createClinicTemplate(
				{
					facilityId: "fac-1",
					clinicianStaffId: "clinician-1",
					clinicName: "OPD AM",
					dayOfWeek: 1,
					startTime: "08:00",
					endTime: "10:00",
					maxPatients: 8,
					slotDurationMinutes: 15,
				},
				actor
			)

			const initialSlots = await service.listTemplateSlots({
				id: createdTemplate.id,
				fromDate: "2026-05-07",
				toDate: "2026-05-12",
			})

			await service.updateSlot(
				{ id: openSlot.id, action: "block", reason: "Clinician leave" },
				actor
			)

			const updatedSlots = await service.listTemplateSlots({
				id: createdTemplate.id,
				fromDate: "2026-05-07",
				toDate: "2026-05-12",
			})

			expect(initialSlots).toEqual([openSlot])
			expect(updatedSlots).toEqual([blockedSlot])
			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenNthCalledWith(
				1,
				createdTemplate.id,
				expect.any(String),
				expect.any(String)
			)
			expect(mockSlotGenerator.generateSlotsForTemplate).toHaveBeenCalledWith(
				createdTemplate.id,
				"2026-05-07",
				"2026-05-12"
			)
			expect(mockAuditService.log).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						event: "audit.scheduling.slot.block",
						actorStaffId: actor.staffProfileId,
					}),
				}),
				expect.any(Object)
			)
		})
	})
})
