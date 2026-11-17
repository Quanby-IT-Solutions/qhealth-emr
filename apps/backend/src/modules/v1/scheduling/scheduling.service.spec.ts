import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"
import { closeOpenSlaStep } from "@/utils/sla-events"
import { resolveStepTarget } from "@/utils/sla-step-target"

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
	lt: (left: unknown, right: unknown) => ({ op: "lt", left, right }),
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
		clinicianStaffId: "clinicSlots.clinicianStaffId",
		slotDate: "clinicSlots.slotDate",
		slotStartTime: "clinicSlots.slotStartTime",
		slotEndTime: "clinicSlots.slotEndTime",
		status: "clinicSlots.status",
		appointmentId: "clinicSlots.appointmentId",
		facilityId: "clinicSlots.facilityId",
		updatedAt: "clinicSlots.updatedAt",
	},
	staffProfiles: {
		id: "staffProfiles.id",
		userId: "staffProfiles.userId",
		facilityId: "staffProfiles.facilityId",
	},
	appointments: {
		id: "appointments.id",
		facilityId: "appointments.facilityId",
		clinicTemplateId: "appointments.clinicTemplateId",
		clinicSlotId: "appointments.clinicSlotId",
		patientId: "appointments.patientId",
		clinicianStaffId: "appointments.clinicianStaffId",
		appointmentDate: "appointments.appointmentDate",
		appointmentTime: "appointments.appointmentTime",
		queueNumber: "appointments.queueNumber",
		status: "appointments.status",
		checkedInAt: "appointments.checkedInAt",
		encounterType: "appointments.encounterType",
		chiefComplaint: "appointments.chiefComplaint",
		notes: "appointments.notes",
		bookedByStaffId: "appointments.bookedByStaffId",
		cancelledAt: "appointments.cancelledAt",
		cancellationReason: "appointments.cancellationReason",
		createdAt: "appointments.createdAt",
		updatedAt: "appointments.updatedAt",
	},
	encounters: {
		id: "encounters.id",
		facilityId: "encounters.facilityId",
		patientId: "encounters.patientId",
		encounterType: "encounters.encounterType",
		status: "encounters.status",
		chiefComplaint: "encounters.chiefComplaint",
		admittingStaffId: "encounters.admittingStaffId",
		attendingStaffId: "encounters.attendingStaffId",
		admissionDatetime: "encounters.admissionDatetime",
		appointmentId: "encounters.appointmentId",
		queueNumber: "encounters.queueNumber",
		clinicianStaffId: "encounters.clinicianStaffId",
		queueStatus: "encounters.queueStatus",
		queueCalledByStaffId: "encounters.queueCalledByStaffId",
		queueCalledAt: "encounters.queueCalledAt",
		updatedAt: "encounters.updatedAt",
	},
	vitalSigns: {
		encounterId: "vitalSigns.encounterId",
	},
	encounterStatusEvents: {
		facilityId: "encounterStatusEvents.facilityId",
		encounterId: "encounterStatusEvents.encounterId",
		fromStatus: "encounterStatusEvents.fromStatus",
		toStatus: "encounterStatusEvents.toStatus",
		workflowType: "encounterStatusEvents.workflowType",
		staffId: "encounterStatusEvents.staffId",
		slaTargetMinutes: "encounterStatusEvents.slaTargetMinutes",
		notes: "encounterStatusEvents.notes",
		occurredAt: "encounterStatusEvents.occurredAt",
	},
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

const session = {
	user: {
		id: "user-1",
	},
} as never

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

function makeAppointment(overrides: Record<string, unknown> = {}) {
	return {
		id: "appointment-1",
		facilityId: "fac-1",
		clinicTemplateId: "template-1",
		clinicSlotId: "slot-1",
		patientId: "patient-1",
		clinicianStaffId: "clinician-1",
		appointmentDate: "2026-05-07",
		appointmentTime: "08:00",
		queueNumber: 1,
		status: "booked",
		checkedInAt: null,
		encounterType: "outpatient",
		chiefComplaint: null,
		notes: null,
		bookedByStaffId: "staff-actor-1",
		cancelledAt: null,
		cancellationReason: null,
		createdAt: new Date("2026-05-06T00:00:00.000Z"),
		updatedAt: new Date("2026-05-06T00:00:00.000Z"),
		...overrides,
	}
}

function makeEncounter(overrides: Record<string, unknown> = {}) {
	return {
		id: "encounter-1",
		facilityId: "fac-1",
		patientId: "patient-1",
		encounterType: "outpatient",
		status: "active",
		chiefComplaint: "Scheduled OPD appointment",
		admittingStaffId: "staff-actor-1",
		attendingStaffId: "clinician-1",
		admissionDatetime: new Date("2026-05-07T08:00:00.000Z"),
		appointmentId: "appointment-1",
		queueNumber: 1,
		clinicianStaffId: "clinician-1",
		queueStatus: "waiting",
		queueCalledByStaffId: null,
		queueCalledAt: null,
		createdAt: new Date("2026-05-07T08:00:00.000Z"),
		updatedAt: new Date("2026-05-07T08:00:00.000Z"),
		...overrides,
	}
}

function makeQueryResult(rows: unknown[]) {
	const promise = Promise.resolve(rows)
	const result = {
		then: promise.then.bind(promise),
		catch: promise.catch.bind(promise),
		finally: promise.finally.bind(promise),
		limit: jest.fn(),
		orderBy: jest.fn(),
		offset: jest.fn(),
		for: jest.fn(),
	}

	result.limit.mockImplementation(() => {
		const limitedPromise = Promise.resolve(rows)
		return {
			then: limitedPromise.then.bind(limitedPromise),
			catch: limitedPromise.catch.bind(limitedPromise),
			finally: limitedPromise.finally.bind(limitedPromise),
			for: jest.fn().mockResolvedValue(rows),
		}
	})
	result.orderBy.mockImplementation(() => makeQueryResult(rows))
	result.offset.mockResolvedValue(rows)
	result.for.mockResolvedValue(rows)

	return result
}

function mockSelectWhere(rows: unknown[]) {
	return {
		where: jest.fn().mockReturnValue(makeQueryResult(rows)),
	}
}

function mockSelectChain(rows: unknown[]) {
	return {
		from: jest.fn().mockReturnValue(mockSelectWhere(rows)),
	}
}

function mockClinicianStaffSubquery() {
	return {
		from: jest.fn().mockReturnValue({
			innerJoin: jest.fn().mockReturnValue({
				as: jest.fn().mockReturnValue("clinician_staff"),
			}),
		}),
	}
}

function mockQueueSelectChain(rows: unknown[]) {
	const orderBy = jest.fn().mockResolvedValue(rows)
	const where = jest.fn().mockReturnValue({ orderBy })
	const leftJoinFourth = jest.fn().mockReturnValue({ where })
	const leftJoinThird = jest.fn().mockReturnValue({ leftJoin: leftJoinFourth })
	const leftJoinSecond = jest.fn().mockReturnValue({ leftJoin: leftJoinThird })
	const leftJoinFirst = jest.fn().mockReturnValue({ leftJoin: leftJoinSecond })
	const innerJoin = jest.fn().mockReturnValue({ leftJoin: leftJoinFirst })
	const from = jest.fn().mockReturnValue({ innerJoin })

	return {
		from,
		innerJoin,
		leftJoinFirst,
		leftJoinSecond,
		leftJoinThird,
		leftJoinFourth,
		where,
		orderBy,
	}
}

function mockActiveCoordinatorSelectChain(rows: unknown[]) {
	const limit = jest.fn().mockResolvedValue(rows)
	const orderBy = jest.fn().mockReturnValue({ limit })
	const where = jest.fn().mockReturnValue({ orderBy })
	const leftJoinFourth = jest.fn().mockReturnValue({ where })
	const leftJoinThird = jest.fn().mockReturnValue({ leftJoin: leftJoinFourth })
	const leftJoinSecond = jest.fn().mockReturnValue({ leftJoin: leftJoinThird })
	const leftJoinFirst = jest.fn().mockReturnValue({ leftJoin: leftJoinSecond })
	const innerJoin = jest.fn().mockReturnValue({ leftJoin: leftJoinFirst })
	const from = jest.fn().mockReturnValue({ innerJoin })

	return {
		from,
		innerJoin,
		leftJoinFirst,
		leftJoinSecond,
		leftJoinThird,
		leftJoinFourth,
		where,
		orderBy,
		limit,
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

function mockUpdateWithoutReturning() {
	return {
		set: jest.fn().mockReturnValue({
			where: jest.fn().mockResolvedValue(undefined),
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
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([{ id: "clinician-1" }]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						insert: jest.fn().mockReturnValue(mockInsertReturning(created)),
					}
					return fn(tx)
				}
			)

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
			const updated = makeTemplate({
				startTime: "09:00",
				updatedAt: new Date("2026-05-07T00:00:00.000Z"),
			})
			const deleteChain = mockDeleteChain()

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
						delete: jest.fn().mockReturnValue(deleteChain),
					}
					return fn(tx)
				}
			)

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
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
						delete: jest.fn().mockReturnValue(mockDeleteChain()),
					}
					return fn(tx)
				}
			)

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
			const slot = makeSlot({ slotStartTime: "08:00:00", slotEndTime: "08:15:00" })
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
			expect(result).toEqual([
				{
					...slot,
					slotStartTime: "08:00",
					slotEndTime: "08:15",
				},
			])
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
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
					}
					return fn(tx)
				}
			)

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
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest.fn().mockReturnValue(mockUpdateReturning(updated)),
					}
					return fn(tx)
				}
			)

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

			await expect(
				service.updateSlot({ id: "missing-slot", action: "block" }, actor)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe("createAppointment()", () => {
		it("books an open slot and allows only one winner under concurrent attempts", async () => {
			let slotState = makeSlot({ status: "open", appointmentId: null })
			let createdCount = 0
			let queueTail = Promise.resolve()

			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const previous = queueTail
					let release: (() => void) | undefined
					queueTail = new Promise<void>(resolve => {
						release = resolve
					})
					await previous

					let selectCall = 0
					const tx = {
						select: jest.fn().mockImplementation(() => {
							selectCall += 1

							if (selectCall === 1) {
								return {
									from: jest.fn().mockReturnValue({
										where: jest.fn().mockReturnValue({
											limit: jest.fn().mockReturnValue({
												for: jest.fn().mockResolvedValue([slotState]),
											}),
										}),
									}),
								}
							}

							if (selectCall === 2) {
								return mockSelectChain([])
							}

							if (selectCall === 3) {
								return mockSelectChain([{ maxQueue: createdCount }])
							}

							return mockSelectChain([{ id: actor.staffProfileId }])
						}),
						insert: jest.fn().mockImplementation(() => ({
							values: jest.fn().mockReturnValue({
								returning: jest.fn().mockImplementation(async () => {
									createdCount += 1
									return [
										makeAppointment({
											id: `appointment-${createdCount}`,
											clinicSlotId: slotState.id,
											queueNumber: createdCount,
										}),
									]
								}),
							}),
						})),
						update: jest.fn().mockImplementation(() => ({
							set: jest.fn().mockReturnValue({
								where: jest.fn().mockImplementation(async () => {
									slotState = makeSlot({
										...slotState,
										status: "booked",
										appointmentId: `appointment-${createdCount}`,
									})
									return undefined
								}),
							}),
						})),
					}

					try {
						return await fn(tx)
					} finally {
						release?.()
					}
				}
			)

			const bookingInput = {
				facilityId: "fac-1",
				clinicSlotId: "slot-1",
				patientId: "patient-1",
				clinicianStaffId: "clinician-1",
				appointmentDate: "2026-05-07",
				appointmentTime: "08:00",
			}

			const results = await Promise.allSettled([
				service.createAppointment(bookingInput, session),
				service.createAppointment({ ...bookingInput, patientId: "patient-2" }, session),
			])

			const fulfilledCount = results.filter(result => result.status === "fulfilled").length
			const rejected = results.find(
				(result): result is PromiseRejectedResult => result.status === "rejected"
			)

			expect(fulfilledCount).toBe(1)
			expect(rejected).toBeDefined()
			expect(rejected!.reason).toBeInstanceOf(ConflictException)
			expect(slotState.status).toBe("booked")
			expect(slotState.appointmentId).toBe("appointment-1")
		})
	})

	describe("checkInAppointment()", () => {
		it("creates a linked OPD encounter when a booked appointment is checked in", async () => {
			const existing = makeAppointment({
				status: "booked",
				queueNumber: 3,
				chiefComplaint: "Cough",
			})
			const updated = makeAppointment({
				status: "checked_in",
				queueNumber: 3,
				checkedInAt: new Date("2026-05-07T08:00:00.000Z"),
			})
			const encounter = makeEncounter({
				chiefComplaint: "Cough",
				queueNumber: 3,
			})
			const insertEncounter = mockInsertReturning(encounter)
			const insertStatusEvent = { values: jest.fn().mockResolvedValue(undefined) }
			const updateAppointment = mockUpdateReturning(updated)

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						select: jest.fn().mockReturnValueOnce(mockSelectChain([])),
						insert: jest
							.fn()
							.mockReturnValueOnce(insertEncounter)
							.mockReturnValueOnce(insertStatusEvent),
						update: jest.fn().mockReturnValue(updateAppointment),
					}

					return fn(tx)
				}
			)

			const result = await service.checkInAppointment({ id: "appointment-1" })

			expect(result.queueNumber).toBe(3)
			expect(result.appointment.status).toBe("checked_in")
			expect(insertEncounter.values).toHaveBeenCalledWith(
				expect.objectContaining({
					facilityId: "fac-1",
					patientId: "patient-1",
					encounterType: "outpatient",
					appointmentId: "appointment-1",
					clinicianStaffId: "clinician-1",
					queueNumber: 3,
					queueStatus: "waiting",
				})
			)
			expect(insertStatusEvent.values).toHaveBeenCalledWith(
				expect.objectContaining({
					encounterId: "encounter-1",
					toStatus: "waiting",
					workflowType: "opd",
				})
			)
		})
	})

	describe("getClinicQueue()", () => {
		it("returns facility-wide walk-ins with null clinician assignment when no clinician filter is provided", async () => {
			const rows = [
				{
					id: "encounter-late",
					appointmentId: null,
					encounterId: "encounter-late",
					queueNumber: 2,
					slotTime: null,
					checkedInAt: new Date("2026-05-07T08:30:00.000Z"),
					queueStatus: "waiting",
					patientId: "patient-2",
					patientFirstName: "Ben",
					patientLastName: "Santos",
					patientMrn: "MRN-002",
					patientDateOfBirth: new Date(1981, 1, 3),
					clinicianStaffId: null,
					clinicianName: null,
					clinicName: null,
				},
				{
					id: "encounter-early",
					appointmentId: null,
					encounterId: "encounter-early",
					queueNumber: 1,
					slotTime: null,
					checkedInAt: new Date("2026-05-07T08:00:00.000Z"),
					queueStatus: "in_progress",
					patientId: "patient-1",
					patientFirstName: "Ana",
					patientLastName: "Reyes",
					patientMrn: "MRN-001",
					patientDateOfBirth: new Date(1980, 0, 1),
					clinicianStaffId: null,
					clinicianName: null,
					clinicName: null,
				},
				{
					id: "encounter-completed",
					appointmentId: null,
					encounterId: "encounter-completed",
					queueNumber: 3,
					slotTime: null,
					checkedInAt: new Date("2026-05-07T09:00:00.000Z"),
					queueStatus: "completed",
					patientId: "patient-3",
					patientFirstName: "Cara",
					patientLastName: "Lim",
					patientMrn: "MRN-003",
					patientDateOfBirth: new Date(1975, 2, 4),
					clinicianStaffId: null,
					clinicianName: null,
					clinicName: null,
				},
			]
			const queueSelect = mockQueueSelectChain(rows)

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(queueSelect)

			const result = await service.getClinicQueue({
				facilityId: "fac-1",
				date: "2026-05-07",
			})

			expect(result.entries.map(entry => entry.encounterId)).toEqual([
				"encounter-early",
				"encounter-late",
				"encounter-completed",
			])
			expect(result.entries[0]?.patientDateOfBirth).toBe("1980-01-01")
			expect(result.entries.every(entry => entry.clinicianStaffId === null)).toBe(true)
			expect(result.stats).toEqual({
				waiting: 1,
				inProgress: 1,
				completed: 1,
				noShow: 0,
				total: 3,
			})
			expect(queueSelect.orderBy).toHaveBeenCalledWith(
				"encounters.queueNumber",
				"encounters.admissionDatetime",
				"encounters.id"
			)

			const whereArg = queueSelect.where.mock.calls[0]?.[0]
			expect(whereArg.args).not.toContainEqual(
				expect.objectContaining({
					op: "eq",
					left: "encounters.clinicianStaffId",
				})
			)
		})

		it("preserves clinician-scoped filtering when a clinician filter is provided", async () => {
			const rows = [
				{
					id: "encounter-1",
					appointmentId: "appointment-1",
					encounterId: "encounter-1",
					queueNumber: 1,
					slotTime: "08:00",
					checkedInAt: new Date("2026-05-07T08:05:00.000Z"),
					queueStatus: "waiting",
					patientId: "patient-1",
					patientFirstName: "Ana",
					patientLastName: "Reyes",
					patientMrn: "MRN-001",
					patientDateOfBirth: "1980-01-01",
					clinicianStaffId: "clinician-1",
					clinicianName: "Dr. Cruz",
					clinicName: "OPD AM",
				},
			]
			const queueSelect = mockQueueSelectChain(rows)

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(queueSelect)

			const result = await service.getClinicQueue({
				facilityId: "fac-1",
				clinicianStaffId: "clinician-1",
				date: "2026-05-07",
			})

			expect(result.entries[0]).toEqual(
				expect.objectContaining({
					entryType: "appointment",
					appointmentId: "appointment-1",
					clinicianStaffId: "clinician-1",
					clinicianName: "Dr. Cruz",
					patientDateOfBirth: "1980-01-01",
				})
			)

			const whereArg = queueSelect.where.mock.calls[0]?.[0]
			expect(whereArg.args).toContainEqual(
				expect.objectContaining({
					op: "eq",
					left: "encounters.clinicianStaffId",
					right: "clinician-1",
				})
			)
		})

		it("filters the requested queue date using Asia/Manila day boundaries", async () => {
			const queueSelect = mockQueueSelectChain([])

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(queueSelect)

			await service.getClinicQueue({
				facilityId: "fac-1",
				date: "2026-05-07",
			})

			const whereArg = queueSelect.where.mock.calls[0]?.[0]
			expect(whereArg.args).toContainEqual({
				op: "gte",
				left: "encounters.admissionDatetime",
				right: new Date("2026-05-06T16:00:00.000Z"),
			})
			expect(whereArg.args).toContainEqual({
				op: "lt",
				left: "encounters.admissionDatetime",
				right: new Date("2026-05-07T16:00:00.000Z"),
			})
		})

		it("returns an active coordinator entry outside the selected queue date", async () => {
			const rows = [
				{
					id: "encounter-today",
					appointmentId: null,
					encounterId: "encounter-today",
					queueNumber: 1,
					slotTime: null,
					checkedInAt: new Date("2026-05-07T08:00:00.000Z"),
					queueStatus: "waiting",
					patientId: "patient-today",
					patientFirstName: "Ben",
					patientLastName: "Santos",
					patientMrn: "MRN-002",
					patientDateOfBirth: "1981-02-03",
					clinicianStaffId: null,
					clinicianName: null,
					calledByStaffId: null,
					calledByName: null,
					calledAt: null,
					clinicName: null,
				},
			]
			const staleActiveRows = [
				{
					id: "encounter-yesterday",
					appointmentId: null,
					encounterId: "encounter-yesterday",
					queueNumber: 4,
					slotTime: null,
					checkedInAt: new Date("2026-05-06T08:00:00.000Z"),
					queueStatus: "in_progress",
					patientId: "patient-yesterday",
					patientFirstName: "Ana",
					patientLastName: "Reyes",
					patientMrn: "MRN-001",
					patientDateOfBirth: "1980-01-01",
					clinicianStaffId: null,
					clinicianName: null,
					calledByStaffId: actor.staffProfileId,
					calledByName: "Coordinator One",
					calledAt: new Date("2026-05-06T08:05:00.000Z"),
					clinicName: null,
				},
			]
			const queueSelect = mockQueueSelectChain(rows)
			const activeCoordinatorSelect = mockActiveCoordinatorSelectChain(staleActiveRows)

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(queueSelect)
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(mockClinicianStaffSubquery())
				.mockReturnValueOnce(activeCoordinatorSelect)

			const result = await service.getClinicQueue({
				facilityId: "fac-1",
				calledByStaffId: actor.staffProfileId,
				date: "2026-05-07",
			})

			expect(result.entries.map(entry => entry.encounterId)).toEqual(["encounter-today"])
			expect(result.activeCoordinatorEntry).toEqual(
				expect.objectContaining({
					encounterId: "encounter-yesterday",
					status: "in_progress",
					calledByStaffId: actor.staffProfileId,
					patientName: "Reyes, Ana",
					checkInTime: "2026-05-06T08:00:00.000Z",
				})
			)
			expect(result.stats).toEqual({
				waiting: 1,
				inProgress: 0,
				completed: 0,
				noShow: 0,
				total: 1,
			})
		})
	})

	describe("updateAppointmentStatus()", () => {
		it("releases the linked slot when an appointment is cancelled", async () => {
			const existing = makeAppointment({ clinicSlotId: "slot-1", status: "booked" })
			const updated = makeAppointment({
				clinicSlotId: "slot-1",
				status: "cancelled",
				cancelledAt: new Date("2026-05-06T10:00:00.000Z"),
				cancellationReason: "Patient requested",
			})
			const slotReleaseChain = mockUpdateWithoutReturning()

			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([existing]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						update: jest
							.fn()
							.mockImplementationOnce(() => mockUpdateReturning(updated))
							.mockImplementationOnce(() => slotReleaseChain),
					}
					return fn(tx)
				}
			)

			const result = await service.updateAppointmentStatus({
				id: existing.id,
				status: "cancelled",
				cancellationReason: "Patient requested",
			})

			expect(result.status).toBe("cancelled")
			expect(slotReleaseChain.set).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "open",
					appointmentId: null,
				})
			)
		})
	})

	describe("updateEncounterQueueStatus()", () => {
		it("updates queue status and writes the SLA event inside the same transaction", async () => {
			const current = makeEncounter({ queueStatus: "waiting" })
			const updated = makeEncounter({ queueStatus: "in_progress" })
			const updateEncounter = mockUpdateReturning(updated)
			const updateAppointment = mockUpdateWithoutReturning()
			const insertStatusEvent = { values: jest.fn().mockResolvedValue(undefined) }
			let transactionClient: unknown
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([current]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						select: jest.fn().mockReturnValue(mockSelectChain([])),
						update: jest
							.fn()
							.mockReturnValueOnce(updateEncounter)
							.mockReturnValueOnce(updateAppointment),
						insert: jest.fn().mockReturnValueOnce(insertStatusEvent),
					}
					transactionClient = tx
					return fn(tx)
				}
			)

			const result = await service.updateEncounterQueueStatus(
				{
					id: current.id,
					status: "in_progress",
					calledByStaffId: "client-staff-1",
				},
				actor
			)

			expect(result).toEqual({ id: "encounter-1", queueStatus: "in_progress" })
			expect(resolveStepTarget).toHaveBeenCalledWith("fac-1", "opd", "in_progress")
			expect(closeOpenSlaStep).toHaveBeenCalledWith(
				transactionClient,
				"encounter-1",
				"opd",
				expect.any(Date)
			)
			expect(insertStatusEvent.values).toHaveBeenCalledWith(
				expect.objectContaining({
					encounterId: "encounter-1",
					fromStatus: "waiting",
					toStatus: "in_progress",
					workflowType: "opd",
					staffId: actor.staffProfileId,
					slaTargetMinutes: 15,
					notes: "OPD queue: waiting -> in_progress",
				})
			)
		})

		it("marks the called patient as no-show and syncs the linked appointment", async () => {
			const current = makeEncounter({
				queueStatus: "in_progress",
				queueCalledByStaffId: actor.staffProfileId,
			})
			const updated = makeEncounter({
				queueStatus: "no_show",
				queueCalledByStaffId: actor.staffProfileId,
			})
			const updateEncounter = mockUpdateReturning(updated)
			const updateAppointment = mockUpdateWithoutReturning()
			const insertStatusEvent = { values: jest.fn().mockResolvedValue(undefined) }
			let updateMock: jest.Mock
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([current]))
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					updateMock = jest
						.fn()
						.mockReturnValueOnce(updateEncounter)
						.mockReturnValueOnce(updateAppointment)
					const tx = {
						select: jest.fn().mockReturnValue(mockSelectChain([])),
						update: updateMock,
						insert: jest.fn().mockReturnValueOnce(insertStatusEvent),
					}
					return fn(tx)
				}
			)

			const result = await service.updateEncounterQueueStatus(
				{
					id: current.id,
					status: "no_show",
				},
				actor
			)

			expect(result).toEqual({ id: "encounter-1", queueStatus: "no_show" })
			expect(resolveStepTarget).toHaveBeenCalledWith("fac-1", "opd", "no_show")
			expect(updateAppointment.set).toHaveBeenCalledWith(
				expect.objectContaining({ status: "no_show" })
			)
			expect(insertStatusEvent.values).toHaveBeenCalledWith(
				expect.objectContaining({
					encounterId: "encounter-1",
					fromStatus: "in_progress",
					toStatus: "no_show",
					workflowType: "opd",
					staffId: actor.staffProfileId,
					notes: "OPD queue: in_progress -> no_show",
				})
			)
		})

		it("rejects no-show updates from staff who did not call the patient", async () => {
			const current = makeEncounter({
				queueStatus: "in_progress",
				queueCalledByStaffId: "staff-who-called",
			})
			;(db.select as jest.Mock).mockReturnValueOnce(mockSelectChain([current]))

			await expect(
				service.updateEncounterQueueStatus(
					{
						id: current.id,
						status: "no_show",
					},
					actor
				)
			).rejects.toThrow(ConflictException)

			expect(db.transaction).not.toHaveBeenCalled()
		})
	})

	describe("callNextQueuePatient()", () => {
		it("atomically claims the next waiting encounter for the current coordinator", async () => {
			const claimed = {
				id: "encounter-1",
				facilityId: "fac-1",
				appointmentId: "appointment-1",
				queueStatus: "in_progress",
				queueCalledByStaffId: actor.staffProfileId,
				queueCalledAt: new Date("2026-05-07T08:05:00.000Z"),
			}
			const updateAppointment = mockUpdateWithoutReturning()
			const insertStatusEvent = { values: jest.fn().mockResolvedValue(undefined) }
			let transactionClient: unknown
			let executeMock: jest.Mock
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					executeMock = jest.fn().mockResolvedValue({ rows: [claimed] })
					const tx = {
						select: jest.fn().mockReturnValue(mockSelectChain([])),
						execute: executeMock,
						update: jest.fn().mockReturnValueOnce(updateAppointment),
						insert: jest.fn().mockReturnValueOnce(insertStatusEvent),
					}
					transactionClient = tx
					return fn(tx)
				}
			)

			const result = await service.callNextQueuePatient(
				{
					facilityId: "fac-1",
					clinicianStaffId: "clinician-1",
					date: "2026-05-07",
					calledByStaffId: "client-staff-1",
				},
				actor
			)

			expect(result).toEqual({ id: "encounter-1", queueStatus: "in_progress" })
			expect(executeMock!).toHaveBeenCalledTimes(1)
			expect(resolveStepTarget).toHaveBeenCalledWith("fac-1", "opd", "in_progress")
			expect(closeOpenSlaStep).toHaveBeenCalledWith(
				transactionClient,
				"encounter-1",
				"opd",
				expect.any(Date)
			)
			expect(insertStatusEvent.values).toHaveBeenCalledWith(
				expect.objectContaining({
					facilityId: "fac-1",
					encounterId: "encounter-1",
					fromStatus: "waiting",
					toStatus: "in_progress",
					workflowType: "opd",
					staffId: actor.staffProfileId,
					slaTargetMinutes: 15,
					notes: "OPD queue: waiting -> in_progress",
				})
			)
		})

		it("rejects calling another patient when the coordinator has an active queue patient", async () => {
			;(db.transaction as jest.Mock).mockImplementation(
				async (fn: (tx: unknown) => Promise<unknown>) => {
					const tx = {
						select: jest.fn().mockReturnValue(mockSelectChain([{ id: "encounter-active" }])),
					}
					return fn(tx)
				}
			)

			await expect(
				service.callNextQueuePatient(
					{
						facilityId: "fac-1",
						date: "2026-05-07",
					},
					actor
				)
			).rejects.toBeInstanceOf(ConflictException)
		})
	})

	describe("getAvailableSlots()", () => {
		it("returns only open/booked slot rows and includes slotId", async () => {
			const template = makeTemplate({ dayOfWeek: 4 })
			const availableRows = [
				{ slotId: "slot-open", time: "08:00", available: true },
				{ slotId: "slot-booked", time: "08:15", available: false },
			]

			;(db.select as jest.Mock)
				.mockReturnValueOnce(mockSelectChain([template]))
				.mockReturnValueOnce(mockSelectChain(availableRows))

			const result = await service.getAvailableSlots({
				clinicianStaffId: "clinician-1",
				date: "2026-05-07",
			})

			expect(result).toEqual({
				clinicName: template.clinicName,
				slots: [
					{ slotId: "slot-open", time: "08:00", available: true },
					{ slotId: "slot-booked", time: "08:15", available: false },
				],
			})
			expect(mockSlotGenerator.generateSlotsForTemplate).not.toHaveBeenCalled()
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
