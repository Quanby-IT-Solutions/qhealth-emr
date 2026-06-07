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
		updatedAt: "encounters.updatedAt",
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
