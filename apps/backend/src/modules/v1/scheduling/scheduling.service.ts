import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { and, count, eq, gte, isNotNull, lt, sql, type SQL } from "drizzle-orm"

import {
	appointments,
	clinicSlots,
	clinicTemplates,
	encounters,
	encounterStatusEvents,
	patients,
	staffProfiles,
	users,
	vitalSigns,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { AuditService, type DBTransaction } from "@/modules/v1/audit/audit.service"
import { NotificationService } from "@/modules/v1/notifications/notification.service"
import { closeOpenSlaStep } from "@/utils/sla-events"
import { resolveStepTarget } from "@/utils/sla-step-target"

import { SlotGeneratorService } from "./slot-generator.service"

type WorkflowType = "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing"

type ClinicTemplateListInput = V1Inputs["scheduling"]["listClinicTemplates"]
type CreateClinicTemplateInput = V1Inputs["scheduling"]["createClinicTemplate"]
type UpdateClinicTemplateInput = V1Inputs["scheduling"]["updateClinicTemplate"]
type ListTemplateSlotsInput = V1Inputs["scheduling"]["listTemplateSlots"]
type UpdateSlotInput = V1Inputs["scheduling"]["updateSlot"]
type AppointmentListInput = V1Inputs["scheduling"]["listAppointments"]
type CreateAppointmentInput = V1Inputs["scheduling"]["createAppointment"] & {
	clinicSlotId?: string
}
type CheckInAppointmentInput = V1Inputs["scheduling"]["checkInAppointment"]
type UpdateAppointmentStatusInput = V1Inputs["scheduling"]["updateAppointmentStatus"]
type AvailableSlotsInput = V1Inputs["scheduling"]["getAvailableSlots"]
type ClinicQueueInput = V1Inputs["scheduling"]["getClinicQueue"]
type UpdateEncounterQueueStatusInput = V1Inputs["scheduling"]["updateEncounterQueueStatus"]
type CallNextQueuePatientInput = V1Inputs["scheduling"]["callNextQueuePatient"]

type SchedulingActor = {
	userId: string
	facilityId: string
	staffProfileId: string | null
	ipAddress: string | null
	userAgent: string | null
}

type ClaimedQueueEncounter = {
	id: string
	facilityId: string
	appointmentId: string | null
	queueStatus: "waiting" | "in_progress" | "completed" | "no_show"
	queueCalledByStaffId: string | null
	queueCalledAt: Date | null
}

type ClinicQueueRow = {
	id: string
	appointmentId: string | null
	encounterId: string | null
	queueNumber: number | null
	slotTime: string | null
	checkedInAt: Date | null
	queueStatus: string | null
	patientId: string
	patientFirstName: string | null
	patientLastName: string | null
	patientMrn: string | null
	patientDateOfBirth: Date | string | null
	clinicianStaffId: string | null
	clinicianName: string | null
	calledByStaffId: string | null
	calledByName: string | null
	calledAt: Date | null
	clinicName: string | null
	hasVitals: boolean
}

type ClinicTemplateRow = typeof clinicTemplates.$inferSelect

type FieldChange = {
	path: string
	before: unknown
	after: unknown
}

const ALLOWED_SLOT_DURATIONS = [5, 10, 15, 20, 30, 45, 60] as const
const REGENERATIVE_TEMPLATE_FIELDS = ["startTime", "endTime", "slotDurationMinutes"] as const
const MANILA_UTC_OFFSET_MINUTES = 8 * 60

function getManilaDateRange(date: string) {
	const [year, month, day] = date.split("-").map(Number)
	const utcStartMillis =
		Date.UTC(year!, month! - 1, day!, 0, 0, 0, 0) - MANILA_UTC_OFFSET_MINUTES * 60_000
	const start = new Date(utcStartMillis)
	const end = new Date(start)
	end.setUTCDate(end.getUTCDate() + 1)

	return { start, end }
}

@Injectable()
export class SchedulingService {
	private readonly logger = new Logger(SchedulingService.name)
	private readonly slotWindowDays = Number(process.env.SCHEDULER_SLOT_WINDOW_DAYS ?? 60) || 60

	constructor(
		private readonly auditService: AuditService,
		private readonly slotGenerator: SlotGeneratorService,
		private readonly notificationService?: NotificationService
	) {}

	private broadcastOpdQueueUpdate(encounter: {
		id: string
		facilityId: string
		queueStatus: "waiting" | "in_progress" | "completed" | "no_show" | null
		queueCalledByStaffId?: string | null
		queueCalledAt?: Date | null
	}) {
		this.notificationService?.broadcast(
			"opd_queue",
			"OPD queue updated",
			`OPD queue status changed to ${encounter.queueStatus}`,
			{
				encounterId: encounter.id,
				facilityId: encounter.facilityId,
				status: encounter.queueStatus,
				calledByStaffId: encounter.queueCalledByStaffId ?? null,
				calledAt: encounter.queueCalledAt ?? null,
			}
		)
	}

	// ========================================================================
	// Clinic Templates
	// ========================================================================

	async listClinicTemplates(input: ClinicTemplateListInput) {
		const conditions = []

		if (input.facilityId) {
			conditions.push(eq(clinicTemplates.facilityId, input.facilityId))
		}
		if (input.clinicianStaffId) {
			conditions.push(eq(clinicTemplates.clinicianStaffId, input.clinicianStaffId))
		}
		if (input.isActive === true || input.isActive === false) {
			conditions.push(eq(clinicTemplates.isActive, input.isActive))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		return db
			.select()
			.from(clinicTemplates)
			.where(whereClause)
			.orderBy(clinicTemplates.dayOfWeek, clinicTemplates.startTime)
	}

	async createClinicTemplate(input: CreateClinicTemplateInput, actor: SchedulingActor) {
		this.validateTemplateSchedule(input.startTime, input.endTime, input.slotDurationMinutes ?? 15)
		await this.assertClinicianBelongsToFacility(input.clinicianStaffId, input.facilityId)

		const actorStaffId = await this.resolveActorStaffProfileId(actor)
		const [created] = await db.transaction(async (tx: DBTransaction) => {
			const [inserted] = await tx
				.insert(clinicTemplates)
				.values({
					facilityId: input.facilityId,
					clinicianStaffId: input.clinicianStaffId,
					clinicName: input.clinicName,
					dayOfWeek: input.dayOfWeek,
					startTime: input.startTime,
					endTime: input.endTime,
					maxPatients: input.maxPatients ?? 20,
					slotDurationMinutes: input.slotDurationMinutes ?? 15,
				})
				.returning()

			const changes = this.diffCreatedTemplate(inserted!)
			await this.auditService.log(
				{
					facilityId: inserted!.facilityId,
					userId: actor.userId,
					staffProfileId: actorStaffId,
					action: "create",
					entityType: AUDIT_ENTITY_TYPES.CLINIC_TEMPLATE,
					entityId: inserted!.id,
					beforeState: null,
					afterState: inserted! as unknown as Record<string, unknown>,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {
						event: "audit.scheduling.template.create",
						templateId: inserted!.id,
						actorStaffId,
						changes,
					},
				},
				{ tx }
			)

			return [inserted]
		})

		await this.generateSlotsForTemplate(created!.id)
		this.logger.log(
			`audit.scheduling.template.create templateId=${created!.id} actorStaffId=${actorStaffId}`
		)
		return created!
	}

	async updateClinicTemplate(input: UpdateClinicTemplateInput, actor: SchedulingActor) {
		const [existing] = await db
			.select()
			.from(clinicTemplates)
			.where(eq(clinicTemplates.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Clinic template ${input.id} not found`)
		}

		const nextStartTime = input.startTime ?? existing.startTime
		const nextEndTime = input.endTime ?? existing.endTime
		const nextSlotDurationMinutes = input.slotDurationMinutes ?? existing.slotDurationMinutes
		const nextIsActive = input.isActive ?? existing.isActive

		this.validateTemplateSchedule(nextStartTime, nextEndTime, nextSlotDurationMinutes)

		const actorStaffId = await this.resolveActorStaffProfileId(actor)
		const changes = this.diffUpdatedTemplate(existing, input)
		const shouldRegenerate = this.shouldRegenerateTemplate(existing, input)
		const isReactivated = existing.isActive === false && nextIsActive === true

		const [updated] = await db.transaction(async (tx: DBTransaction) => {
			const [saved] = await tx
				.update(clinicTemplates)
				.set({
					clinicName: input.clinicName ?? existing.clinicName,
					startTime: nextStartTime,
					endTime: nextEndTime,
					maxPatients: input.maxPatients ?? existing.maxPatients,
					slotDurationMinutes: nextSlotDurationMinutes,
					isActive: nextIsActive,
					updatedAt: new Date(),
				})
				.where(eq(clinicTemplates.id, input.id))
				.returning()

			if (shouldRegenerate) {
				await tx
					.delete(clinicSlots)
					.where(
						and(
							eq(clinicSlots.clinicTemplateId, input.id),
							gte(clinicSlots.slotDate, this.todayDateString()),
							eq(clinicSlots.status, "open")
						)
					)
			}

			await this.auditService.log(
				{
					facilityId: saved!.facilityId,
					userId: actor.userId,
					staffProfileId: actorStaffId,
					action: "update",
					entityType: AUDIT_ENTITY_TYPES.CLINIC_TEMPLATE,
					entityId: saved!.id,
					beforeState: existing as unknown as Record<string, unknown>,
					afterState: saved! as unknown as Record<string, unknown>,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {
						event: "audit.scheduling.template.update",
						templateId: saved!.id,
						actorStaffId,
						changes,
					},
				},
				{ tx }
			)

			return [saved]
		})

		if (shouldRegenerate || isReactivated) {
			await this.generateSlotsForTemplate(updated!.id)
		}

		this.logger.log(
			`audit.scheduling.template.update templateId=${updated!.id} actorStaffId=${actorStaffId}`
		)
		return updated!
	}

	async listTemplateSlots(input: ListTemplateSlotsInput) {
		this.assertValidSlotRange(input.fromDate, input.toDate)

		const [rangeState] = await db
			.select({
				latestSlotDate: sql<string | null>`max(${clinicSlots.slotDate})`,
			})
			.from(clinicSlots)
			.where(eq(clinicSlots.clinicTemplateId, input.id))

		if (!rangeState?.latestSlotDate || rangeState.latestSlotDate < input.toDate) {
			await this.slotGenerator.generateSlotsForTemplate(input.id, input.fromDate, input.toDate)
		}

		const conditions: SQL[] = [
			eq(clinicSlots.clinicTemplateId, input.id),
			gte(clinicSlots.slotDate, input.fromDate),
			sql`${clinicSlots.slotDate} <= ${input.toDate}`,
		]

		if (input.status) {
			conditions.push(eq(clinicSlots.status, input.status))
		}

		const rows = await db
			.select()
			.from(clinicSlots)
			.where(and(...conditions))
			.orderBy(clinicSlots.slotDate, clinicSlots.slotStartTime)

		return rows.map(row => this.normalizeClinicSlot(row))
	}

	async updateSlot(input: UpdateSlotInput, actor: SchedulingActor) {
		const [existing] = await db.select().from(clinicSlots).where(eq(clinicSlots.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Clinic slot ${input.id} not found`)
		}

		if (input.action === "block") {
			if (existing.status === "booked") {
				throw new ConflictException("Booked slots cannot be blocked")
			}

			const actorStaffId = await this.resolveActorStaffProfileId(actor)
			return db.transaction(async (tx: DBTransaction) => {
				const [updated] = await tx
					.update(clinicSlots)
					.set({
						status: "blocked",
						blockReason: input.reason ?? null,
						blockedByStaffId: actorStaffId,
						blockedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(clinicSlots.id, input.id))
					.returning()

				await this.auditService.log(
					{
						facilityId: updated!.facilityId,
						userId: actor.userId,
						staffProfileId: actorStaffId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.CLINIC_SLOT,
						entityId: updated!.id,
						beforeState: existing as unknown as Record<string, unknown>,
						afterState: updated! as unknown as Record<string, unknown>,
						ipAddress: actor.ipAddress,
						userAgent: actor.userAgent,
						metadata: {
							event: "audit.scheduling.slot.block",
							slotId: updated!.id,
							actorStaffId,
							templateId: updated!.clinicTemplateId,
							slotDate: updated!.slotDate,
							slotStartTime: updated!.slotStartTime,
						},
					},
					{ tx }
				)

				return this.normalizeClinicSlot(updated!)
			})
		}

		if (existing.status === "open") {
			return this.normalizeClinicSlot(existing)
		}

		if (existing.status === "booked" || existing.status === "cancelled") {
			throw new ConflictException(`Slots with status "${existing.status}" cannot be unblocked`)
		}

		const actorStaffId = await this.resolveActorStaffProfileId(actor)
		return db.transaction(async (tx: DBTransaction) => {
			const [updated] = await tx
				.update(clinicSlots)
				.set({
					status: "open",
					blockReason: null,
					blockedByStaffId: null,
					blockedAt: null,
					updatedAt: new Date(),
				})
				.where(eq(clinicSlots.id, input.id))
				.returning()

			await this.auditService.log(
				{
					facilityId: updated!.facilityId,
					userId: actor.userId,
					staffProfileId: actorStaffId,
					action: "update",
					entityType: AUDIT_ENTITY_TYPES.CLINIC_SLOT,
					entityId: updated!.id,
					beforeState: existing as unknown as Record<string, unknown>,
					afterState: updated! as unknown as Record<string, unknown>,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {
						event: "audit.scheduling.slot.unblock",
						slotId: updated!.id,
						actorStaffId,
						templateId: updated!.clinicTemplateId,
						slotDate: updated!.slotDate,
						slotStartTime: updated!.slotStartTime,
					},
				},
				{ tx }
			)

			return this.normalizeClinicSlot(updated!)
		})
	}

	// ========================================================================
	// Appointments
	// ========================================================================

	async listAppointments(input: AppointmentListInput) {
		const conditions = [eq(appointments.facilityId, input.facilityId)]

		if (input.date) {
			conditions.push(eq(appointments.appointmentDate, input.date))
		}
		if (input.clinicianStaffId) {
			conditions.push(eq(appointments.clinicianStaffId, input.clinicianStaffId))
		}
		if (input.patientId) {
			conditions.push(eq(appointments.patientId, input.patientId))
		}
		if (input.status) {
			conditions.push(eq(appointments.status, input.status))
		}

		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 25
		const offset = (page - 1) * limit

		const [totalResult] = await db
			.select({ count: count() })
			.from(appointments)
			.where(and(...conditions))

		const total = totalResult?.count ?? 0

		const rows = await db
			.select({
				id: appointments.id,
				facilityId: appointments.facilityId,
				clinicTemplateId: appointments.clinicTemplateId,
				clinicSlotId: appointments.clinicSlotId,
				patientId: appointments.patientId,
				clinicianStaffId: appointments.clinicianStaffId,
				appointmentDate: appointments.appointmentDate,
				appointmentTime: appointments.appointmentTime,
				queueNumber: appointments.queueNumber,
				status: appointments.status,
				checkedInAt: appointments.checkedInAt,
				encounterType: appointments.encounterType,
				chiefComplaint: appointments.chiefComplaint,
				notes: appointments.notes,
				bookedByStaffId: appointments.bookedByStaffId,
				cancelledAt: appointments.cancelledAt,
				cancellationReason: appointments.cancellationReason,
				createdAt: appointments.createdAt,
				updatedAt: appointments.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.where(and(...conditions))
			.orderBy(appointments.appointmentDate, appointments.appointmentTime)
			.limit(limit)
			.offset(offset)

		const items = rows.map(row => ({
			id: row.id,
			facilityId: row.facilityId,
			clinicTemplateId: row.clinicTemplateId,
			clinicSlotId: row.clinicSlotId,
			patientId: row.patientId,
			clinicianStaffId: row.clinicianStaffId,
			appointmentDate: row.appointmentDate,
			appointmentTime: row.appointmentTime,
			queueNumber: row.queueNumber,
			status: row.status,
			checkedInAt: row.checkedInAt,
			encounterType: row.encounterType,
			chiefComplaint: row.chiefComplaint,
			notes: row.notes,
			bookedByStaffId: row.bookedByStaffId,
			cancelledAt: row.cancelledAt,
			cancellationReason: row.cancellationReason,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			patientName: row.patientFirstName
				? `${row.patientLastName}, ${row.patientFirstName}`
				: undefined,
			patientMrn: row.patientMrn ?? undefined,
		}))

		return {
			items,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getAppointment(id: string) {
		const [row] = await db
			.select({
				id: appointments.id,
				facilityId: appointments.facilityId,
				clinicTemplateId: appointments.clinicTemplateId,
				clinicSlotId: appointments.clinicSlotId,
				patientId: appointments.patientId,
				clinicianStaffId: appointments.clinicianStaffId,
				appointmentDate: appointments.appointmentDate,
				appointmentTime: appointments.appointmentTime,
				queueNumber: appointments.queueNumber,
				status: appointments.status,
				checkedInAt: appointments.checkedInAt,
				encounterType: appointments.encounterType,
				chiefComplaint: appointments.chiefComplaint,
				notes: appointments.notes,
				bookedByStaffId: appointments.bookedByStaffId,
				cancelledAt: appointments.cancelledAt,
				cancellationReason: appointments.cancellationReason,
				createdAt: appointments.createdAt,
				updatedAt: appointments.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				patientSex: patients.sex,
				clinicianName: users.name,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.leftJoin(staffProfiles, eq(appointments.clinicianStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(appointments.id, id))

		if (!row) {
			throw new NotFoundException(`Appointment ${id} not found`)
		}

		return {
			id: row.id,
			facilityId: row.facilityId,
			clinicTemplateId: row.clinicTemplateId,
			clinicSlotId: row.clinicSlotId,
			patientId: row.patientId,
			clinicianStaffId: row.clinicianStaffId,
			appointmentDate: row.appointmentDate,
			appointmentTime: row.appointmentTime,
			queueNumber: row.queueNumber,
			status: row.status,
			checkedInAt: row.checkedInAt,
			encounterType: row.encounterType,
			chiefComplaint: row.chiefComplaint,
			notes: row.notes,
			bookedByStaffId: row.bookedByStaffId,
			cancelledAt: row.cancelledAt,
			cancellationReason: row.cancellationReason,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			patientName: row.patientFirstName
				? `${row.patientLastName}, ${row.patientFirstName}`
				: undefined,
			patientMrn: row.patientMrn ?? undefined,
			patientDateOfBirth: row.patientDateOfBirth ?? undefined,
			patientSex: row.patientSex ?? undefined,
			clinicianName: row.clinicianName ?? undefined,
		}
	}

	async createAppointment(input: CreateAppointmentInput, session: UserSession) {
		const clinicSlotId = input.clinicSlotId ?? (await this.resolveClinicSlotIdForBooking(input))

		if (!clinicSlotId) {
			const created = await this.createAppointmentWithoutSlot(input, session)
			this.logger.log(`Created appointment ${created.id} for patient ${input.patientId}`)
			return created
		}

		const created = await db.transaction(async (tx: DBTransaction) => {
			const [slot] = await tx
				.select()
				.from(clinicSlots)
				.where(eq(clinicSlots.id, clinicSlotId))
				.limit(1)
				.for("update")

			if (!slot) {
				throw new NotFoundException(`Clinic slot ${clinicSlotId} not found`)
			}

			if (slot.status !== "open") {
				throw new ConflictException(
					`Slot ${slot.slotStartTime} on ${slot.slotDate} is not available for booking`
				)
			}

			const [conflict] = await tx
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.clinicianStaffId, slot.clinicianStaffId),
						eq(appointments.appointmentDate, slot.slotDate),
						eq(appointments.appointmentTime, slot.slotStartTime),
						sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
					)
				)
				.limit(1)

			if (conflict) {
				throw new ConflictException(
					`Time slot ${slot.slotStartTime} on ${slot.slotDate} is already booked`
				)
			}

			const queueNumber = await this.getNextQueueNumber(tx, slot.facilityId, slot.slotDate)
			const bookedByStaffId = await this.findBookedByStaffProfileId(tx, session.user.id)

			const [appointment] = await tx
				.insert(appointments)
				.values({
					facilityId: slot.facilityId,
					clinicTemplateId: slot.clinicTemplateId,
					clinicSlotId: slot.id,
					patientId: input.patientId,
					clinicianStaffId: slot.clinicianStaffId,
					appointmentDate: slot.slotDate,
					appointmentTime: slot.slotStartTime,
					queueNumber,
					encounterType: input.encounterType ?? "outpatient",
					chiefComplaint: input.chiefComplaint,
					notes: input.notes,
					bookedByStaffId,
				})
				.returning()

			await tx
				.update(clinicSlots)
				.set({
					status: "booked",
					appointmentId: appointment!.id,
					updatedAt: new Date(),
				})
				.where(eq(clinicSlots.id, slot.id))

			return appointment!
		})

		this.logger.log(`Created appointment ${created.id} for patient ${input.patientId}`)
		return created
	}

	async checkInAppointment(input: CheckInAppointmentInput) {
		const [existing] = await db.select().from(appointments).where(eq(appointments.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Appointment ${input.id} not found`)
		}

		if (existing.status === "checked_in") {
			const [linkedEncounter] = await db
				.select({ id: encounters.id, queueNumber: encounters.queueNumber })
				.from(encounters)
				.where(eq(encounters.appointmentId, existing.id))
				.limit(1)

			if (linkedEncounter) {
				return {
					appointment: existing,
					queueNumber: linkedEncounter.queueNumber ?? existing.queueNumber!,
				}
			}
		}

		if (existing.status !== "booked" && existing.status !== "checked_in") {
			throw new ConflictException(`Cannot check in appointment with status "${existing.status}"`)
		}

		const checkedInAt = new Date()
		const { updated, encounter } = await db.transaction(async (tx: DBTransaction) => {
			const [linkedEncounter] = await tx
				.select({ id: encounters.id, queueNumber: encounters.queueNumber })
				.from(encounters)
				.where(eq(encounters.appointmentId, existing.id))
				.limit(1)
				.for("update")

			const queueNumber =
				linkedEncounter?.queueNumber ??
				existing.queueNumber ??
				(await this.getNextEncounterQueueNumber(
					tx,
					existing.facilityId,
					existing.clinicianStaffId,
					checkedInAt
				))

			let encounterRow = linkedEncounter
			if (!encounterRow) {
				const [createdEncounter] = await tx
					.insert(encounters)
					.values({
						facilityId: existing.facilityId,
						patientId: existing.patientId,
						encounterType: "outpatient",
						status: "active",
						chiefComplaint: existing.chiefComplaint ?? "Scheduled OPD appointment",
						admittingStaffId: existing.bookedByStaffId ?? null,
						attendingStaffId: existing.clinicianStaffId,
						admissionDatetime: checkedInAt,
						appointmentId: existing.id,
						queueNumber,
						clinicianStaffId: existing.clinicianStaffId,
						queueStatus: "waiting",
					})
					.returning()

				if (!createdEncounter) {
					throw new Error("Encounter insert failed")
				}
				encounterRow = createdEncounter

				const queueSlaMins = await resolveStepTarget(existing.facilityId, "opd", "waiting")
				await tx.insert(encounterStatusEvents).values({
					facilityId: existing.facilityId,
					encounterId: createdEncounter.id,
					fromStatus: null,
					toStatus: "waiting",
					workflowType: "opd" as WorkflowType,
					staffId: existing.bookedByStaffId ?? null,
					slaTargetMinutes: queueSlaMins,
					notes: "Appointment check-in: placed in clinic queue",
					occurredAt: checkedInAt,
				})
			}

			const [saved] = await tx
				.update(appointments)
				.set({
					status: "checked_in",
					checkedInAt,
					queueNumber,
					updatedAt: checkedInAt,
				})
				.where(eq(appointments.id, input.id))
				.returning()

			return { updated: saved!, encounter: encounterRow! }
		})

		this.logger.log(
			`Checked in appointment ${input.id}, encounter ${encounter.id}, queue number: ${encounter.queueNumber}`
		)

		return {
			appointment: updated!,
			queueNumber: encounter.queueNumber!,
		}
	}

	async updateAppointmentStatus(input: UpdateAppointmentStatusInput) {
		const [existing] = await db.select().from(appointments).where(eq(appointments.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Appointment ${input.id} not found`)
		}

		const updateData: Record<string, unknown> = {
			status: input.status,
			updatedAt: new Date(),
		}

		if (input.status === "cancelled") {
			updateData.cancelledAt = new Date()
			if (input.cancellationReason) {
				updateData.cancellationReason = input.cancellationReason
			}
		}

		const [updated] = await db.transaction(async (tx: DBTransaction) => {
			const [saved] = await tx
				.update(appointments)
				.set(updateData)
				.where(eq(appointments.id, input.id))
				.returning()

			if ((input.status === "cancelled" || input.status === "no_show") && existing.clinicSlotId) {
				await tx
					.update(clinicSlots)
					.set({
						status: "open",
						appointmentId: null,
						updatedAt: new Date(),
					})
					.where(eq(clinicSlots.id, existing.clinicSlotId))
			}

			return [saved]
		})

		// SLA-006: Same constraint — cancellations cannot be logged to encounterStatusEvents
		// without a real encounterId.  If an encounter was already created for this appointment,
		// the ed/opd queue status update will track the SLA event instead.
		this.logger.log(`Updated appointment ${input.id} status to ${input.status}`)
		return updated!
	}

	// ========================================================================
	// Availability & Queue
	// ========================================================================

	async getAvailableSlots(input: AvailableSlotsInput) {
		const dayOfWeek = new Date(input.date).getDay()
		const clinicianId = input.clinicianStaffId || input.clinicianId

		if (!clinicianId) {
			return { slots: [], clinicName: null }
		}

		const templateConditions: SQL[] = [
			eq(clinicTemplates.clinicianStaffId, clinicianId),
			eq(clinicTemplates.dayOfWeek, dayOfWeek),
			eq(clinicTemplates.isActive, true),
		]

		if (input.facilityId) {
			templateConditions.push(eq(clinicTemplates.facilityId, input.facilityId))
		}

		const templates = await db
			.select()
			.from(clinicTemplates)
			.where(and(...templateConditions))

		if (templates.length === 0) {
			return { slots: [], clinicName: null }
		}

		let slots = await this.listAvailableSlotRows(clinicianId, input.date, input.facilityId)

		if (slots.length === 0) {
			await Promise.all(
				templates.map(template =>
					this.slotGenerator.generateSlotsForTemplate(template.id, input.date, input.date)
				)
			)
			slots = await this.listAvailableSlotRows(clinicianId, input.date, input.facilityId)
		}

		return {
			slots,
			clinicName: templates[0]!.clinicName,
		}
	}

	async getClinicQueue(input: ClinicQueueInput) {
		// PS-003: Unified clinic queue: all checked-in OPD patients are encounter-backed.
		// Scheduled appointments are linked through encounters.appointmentId; walk-ins have no appointment.
		const theFacilityId = input.facilityId ?? input.clinicId

		const { start: dayStart, end: nextDayStart } = getManilaDateRange(input.date)

		const queueConditions: SQL[] = [
			eq(encounters.encounterType, sql`'outpatient'`),
			isNotNull(encounters.queueStatus),
			gte(encounters.admissionDatetime, dayStart),
			lt(encounters.admissionDatetime, nextDayStart),
		]
		if (theFacilityId) {
			queueConditions.push(eq(encounters.facilityId, theFacilityId))
		}
		if (input.clinicianStaffId) {
			queueConditions.push(eq(encounters.clinicianStaffId, input.clinicianStaffId))
		}

		const clinicianStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")
		const calledByStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("called_by_staff")

		const rows: ClinicQueueRow[] = await db
			.select({
				id: encounters.id,
				appointmentId: encounters.appointmentId,
				encounterId: encounters.id,
				queueNumber: encounters.queueNumber,
				slotTime: appointments.appointmentTime,
				checkedInAt: encounters.admissionDatetime,
				queueStatus: encounters.queueStatus,
				patientId: encounters.patientId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				clinicianStaffId: encounters.clinicianStaffId,
				clinicianName: clinicianStaffSq.name,
				calledByStaffId: encounters.queueCalledByStaffId,
				calledByName: calledByStaffSq.name,
				calledAt: encounters.queueCalledAt,
				clinicName: clinicTemplates.clinicName,
				hasVitals: sql<boolean>`exists (
					select 1 from ${vitalSigns}
					where ${vitalSigns.encounterId} = ${encounters.id}
				)`,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(appointments, eq(encounters.appointmentId, appointments.id))
			.leftJoin(clinicianStaffSq, eq(encounters.clinicianStaffId, clinicianStaffSq.id))
			.leftJoin(calledByStaffSq, eq(encounters.queueCalledByStaffId, calledByStaffSq.id))
			.leftJoin(clinicTemplates, eq(appointments.clinicTemplateId, clinicTemplates.id))
			.where(and(...queueConditions))
			.orderBy(encounters.queueNumber, encounters.admissionDatetime, encounters.id)

		const entries = rows.map(row => this.mapClinicQueueRow(row))

		entries.sort((a, b) => {
			const queueComparison =
				(a.queueNumber ?? Number.MAX_SAFE_INTEGER) - (b.queueNumber ?? Number.MAX_SAFE_INTEGER)
			if (queueComparison !== 0) return queueComparison

			const aCheckInTime = a.checkInTime
				? new Date(a.checkInTime).getTime()
				: Number.MAX_SAFE_INTEGER
			const bCheckInTime = b.checkInTime
				? new Date(b.checkInTime).getTime()
				: Number.MAX_SAFE_INTEGER
			if (aCheckInTime !== bCheckInTime) return aCheckInTime - bCheckInTime

			return a.id.localeCompare(b.id)
		})

		const clinicName = rows.find(r => r.clinicName)?.clinicName ?? null
		let activeCoordinatorEntry: ReturnType<typeof this.mapClinicQueueRow> | null = null
		if (input.calledByStaffId && theFacilityId) {
			const activeClinicianStaffSq = db
				.select({ id: staffProfiles.id, name: users.name })
				.from(staffProfiles)
				.innerJoin(users, eq(staffProfiles.userId, users.id))
				.as("clinician_staff")
			const activeCalledByStaffSq = db
				.select({ id: staffProfiles.id, name: users.name })
				.from(staffProfiles)
				.innerJoin(users, eq(staffProfiles.userId, users.id))
				.as("called_by_staff")

			const activeRows: ClinicQueueRow[] = await db
				.select({
					id: encounters.id,
					appointmentId: encounters.appointmentId,
					encounterId: encounters.id,
					queueNumber: encounters.queueNumber,
					slotTime: appointments.appointmentTime,
					checkedInAt: encounters.admissionDatetime,
					queueStatus: encounters.queueStatus,
					patientId: encounters.patientId,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMrn: patients.mrn,
					patientDateOfBirth: patients.dateOfBirth,
					clinicianStaffId: encounters.clinicianStaffId,
					clinicianName: activeClinicianStaffSq.name,
					calledByStaffId: encounters.queueCalledByStaffId,
					calledByName: activeCalledByStaffSq.name,
					calledAt: encounters.queueCalledAt,
					clinicName: clinicTemplates.clinicName,
					hasVitals: sql<boolean>`exists (
						select 1 from ${vitalSigns}
						where ${vitalSigns.encounterId} = ${encounters.id}
					)`,
				})
				.from(encounters)
				.innerJoin(patients, eq(encounters.patientId, patients.id))
				.leftJoin(appointments, eq(encounters.appointmentId, appointments.id))
				.leftJoin(
					activeClinicianStaffSq,
					eq(encounters.clinicianStaffId, activeClinicianStaffSq.id)
				)
				.leftJoin(
					activeCalledByStaffSq,
					eq(encounters.queueCalledByStaffId, activeCalledByStaffSq.id)
				)
				.leftJoin(clinicTemplates, eq(appointments.clinicTemplateId, clinicTemplates.id))
				.where(
					and(
						eq(encounters.encounterType, sql`'outpatient'`),
						eq(encounters.facilityId, theFacilityId),
						eq(encounters.queueCalledByStaffId, input.calledByStaffId),
						eq(encounters.queueStatus, "in_progress")
					)
				)
				.orderBy(encounters.admissionDatetime, encounters.id)
				.limit(1)
			activeCoordinatorEntry = activeRows[0] ? this.mapClinicQueueRow(activeRows[0]) : null
		}

		const waiting = entries.filter(e => e.status === "waiting").length
		const inProgress = entries.filter(e => e.status === "in_progress").length
		const completed = entries.filter(e => e.status === "completed").length
		const noShow = entries.filter(e => e.status === "no_show").length

		return {
			entries,
			activeCoordinatorEntry,
			clinicName,
			stats: { waiting, inProgress, completed, noShow, total: entries.length },
		}
	}

	async updateEncounterQueueStatus(
		input: UpdateEncounterQueueStatusInput,
		actor?: Pick<SchedulingActor, "staffProfileId">
	) {
		const actingStaffId = actor?.staffProfileId ?? input.calledByStaffId ?? null

		if (input.status === "in_progress" && !actingStaffId) {
			throw new BadRequestException(
				"A clinic coordinator staff profile is required to call a patient"
			)
		}

		// Fetch current encounter to capture fromStatus and facilityId for the SLA event (PS-005)
		const [current] = await db
			.select({
				id: encounters.id,
				queueStatus: encounters.queueStatus,
				facilityId: encounters.facilityId,
				appointmentId: encounters.appointmentId,
				queueCalledByStaffId: encounters.queueCalledByStaffId,
			})
			.from(encounters)
			.where(eq(encounters.id, input.id))

		if (!current) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		const fromStatus = current.queueStatus ?? null
		if (input.status === "in_progress" && fromStatus !== "waiting") {
			throw new ConflictException("This patient has already been called by another coordinator")
		}
		if (
			input.status === "no_show" &&
			fromStatus === "in_progress" &&
			current.queueCalledByStaffId !== actingStaffId
		) {
			throw new ConflictException("Only the doctor who called this patient can mark no-show")
		}

		const now = new Date()
		const queueSlaMins = await resolveStepTarget(current.facilityId, "opd", input.status)
		const [enc] = await db.transaction(async (tx: DBTransaction) => {
			if (input.status === "in_progress" && actingStaffId) {
				const [activeForCoordinator] = await tx
					.select({ id: encounters.id })
					.from(encounters)
					.where(
						and(
							eq(encounters.queueCalledByStaffId, actingStaffId),
							eq(encounters.queueStatus, "in_progress")
						)
					)

				if (activeForCoordinator && activeForCoordinator.id !== input.id) {
					throw new ConflictException(
						"Finish the current patient at this coordinator counter before calling another"
					)
				}
			}

			const updateValues =
				input.status === "in_progress"
					? {
							queueStatus: input.status,
							queueCalledByStaffId: actingStaffId,
							queueCalledAt: now,
							updatedAt: now,
						}
					: {
							queueStatus: input.status,
							updatedAt: now,
						}

			const [saved] = await tx
				.update(encounters)
				.set(updateValues)
				.where(
					input.status === "in_progress"
						? and(eq(encounters.id, input.id), eq(encounters.queueStatus, "waiting"))
						: eq(encounters.id, input.id)
				)
				.returning()

			if (!saved) {
				throw new ConflictException("This patient has already been called by another coordinator")
			}

			if (current.appointmentId) {
				await tx
					.update(appointments)
					.set({ status: input.status, updatedAt: now })
					.where(eq(appointments.id, current.appointmentId))
			}

			await closeOpenSlaStep(tx, saved.id, "opd", now)

			await tx.insert(encounterStatusEvents).values({
				facilityId: current.facilityId,
				encounterId: saved.id,
				fromStatus,
				toStatus: input.status,
				workflowType: "opd" as WorkflowType,
				staffId: actingStaffId,
				slaTargetMinutes: queueSlaMins,
				notes: `OPD queue: ${fromStatus ?? "none"} -> ${input.status}`,
				occurredAt: now,
			})

			return [saved]
		})

		if (!enc) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		this.broadcastOpdQueueUpdate(enc)

		this.logger.log(`Updated encounter ${input.id} queue status to ${input.status}`)
		return { id: enc.id, queueStatus: enc.queueStatus! }
	}

	async callNextQueuePatient(
		input: CallNextQueuePatientInput,
		actor?: Pick<SchedulingActor, "staffProfileId">
	) {
		const actingStaffId = actor?.staffProfileId ?? input.calledByStaffId ?? null

		if (!actingStaffId) {
			throw new BadRequestException(
				"A clinic coordinator staff profile is required to call a patient"
			)
		}

		const { start: dayStart, end: nextDayStart } = getManilaDateRange(input.date)
		const now = new Date()
		const queueSlaMins = await resolveStepTarget(input.facilityId, "opd", "in_progress")

		const enc = await db.transaction(async (tx: DBTransaction) => {
			const [activeForCoordinator] = await tx
				.select({ id: encounters.id })
				.from(encounters)
				.where(
					and(
						eq(encounters.queueCalledByStaffId, actingStaffId),
						eq(encounters.queueStatus, "in_progress")
					)
				)

			if (activeForCoordinator) {
				throw new ConflictException(
					"Finish the current patient at this coordinator counter before calling another"
				)
			}

			const claimResult = (await tx.execute(sql<ClaimedQueueEncounter>`
				UPDATE encounters
				SET
					queue_status = 'in_progress',
					queue_called_by_staff_id = ${actingStaffId},
					queue_called_at = ${now},
					updated_at = ${now}
				WHERE id = (
					SELECT id
					FROM encounters
					WHERE encounter_type = 'outpatient'
						AND queue_status = 'waiting'
						AND facility_id = ${input.facilityId}
						AND admission_datetime >= ${dayStart}
						AND admission_datetime < ${nextDayStart}
						${input.clinicianStaffId ? sql`AND clinician_staff_id = ${input.clinicianStaffId}` : sql``}
					ORDER BY queue_number ASC NULLS LAST, admission_datetime ASC, id ASC
					FOR UPDATE SKIP LOCKED
					LIMIT 1
				)
				RETURNING
					id,
					facility_id AS "facilityId",
					appointment_id AS "appointmentId",
					queue_status AS "queueStatus",
					queue_called_by_staff_id AS "queueCalledByStaffId",
					queue_called_at AS "queueCalledAt"
			`)) as { rows: ClaimedQueueEncounter[] }
			const [saved] = claimResult.rows

			if (!saved) {
				throw new NotFoundException("No waiting OPD patients are available to call")
			}

			if (saved.appointmentId) {
				await tx
					.update(appointments)
					.set({ status: "in_progress", updatedAt: now })
					.where(eq(appointments.id, saved.appointmentId))
			}

			await closeOpenSlaStep(tx, saved.id, "opd", now)

			await tx.insert(encounterStatusEvents).values({
				facilityId: input.facilityId,
				encounterId: saved.id,
				fromStatus: "waiting",
				toStatus: "in_progress",
				workflowType: "opd" as WorkflowType,
				staffId: actingStaffId,
				slaTargetMinutes: queueSlaMins,
				notes: "OPD queue: waiting -> in_progress",
				occurredAt: now,
			})

			return saved
		})

		this.broadcastOpdQueueUpdate(enc)
		this.logger.log(`Called next OPD queue encounter ${enc.id}`)
		return { id: enc.id, queueStatus: enc.queueStatus }
	}

	// ========================================================================
	// Helpers
	// ========================================================================

	private mapClinicQueueRow(row: ClinicQueueRow) {
		return {
			entryType: row.appointmentId ? ("appointment" as const) : ("walk_in" as const),
			id: row.id,
			appointmentId: row.appointmentId,
			encounterId: row.encounterId,
			queueNumber: row.queueNumber,
			slotTime: row.slotTime,
			checkInTime: row.checkedInAt ? row.checkedInAt.toISOString() : null,
			status: (row.queueStatus ?? "waiting") as "waiting" | "in_progress" | "completed" | "no_show",
			patientId: row.patientId,
			patientName: row.patientFirstName
				? `${row.patientLastName}, ${row.patientFirstName}`
				: undefined,
			patientMrn: row.patientMrn ?? undefined,
			patientDateOfBirth: row.patientDateOfBirth
				? this.formatDateOnly(row.patientDateOfBirth)
				: undefined,
			clinicianStaffId: row.clinicianStaffId,
			clinicianName: row.clinicianName ?? undefined,
			calledByStaffId: row.calledByStaffId ?? null,
			calledByName: row.calledByName ?? undefined,
			calledAt: row.calledAt ? row.calledAt.toISOString() : null,
			hasVitals: row.hasVitals,
		}
	}

	private timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(":").map(Number)
		return hours! * 60 + minutes!
	}

	private minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
	}

	private todayDateString(): string {
		return new Date().toISOString().slice(0, 10)
	}

	private formatDateOnly(value: Date | string): string {
		if (typeof value === "string") return value

		const year = value.getFullYear().toString()
		const month = (value.getMonth() + 1).toString().padStart(2, "0")
		const day = value.getDate().toString().padStart(2, "0")

		return `${year}-${month}-${day}`
	}

	private assertValidSlotRange(fromDate: string, toDate: string): void {
		if (fromDate > toDate) {
			throw new BadRequestException("fromDate must be on or before toDate")
		}
	}

	private async resolveClinicSlotIdForBooking(
		input: CreateAppointmentInput
	): Promise<string | undefined> {
		const [existingSlot] = await db
			.select({ id: clinicSlots.id })
			.from(clinicSlots)
			.where(
				and(
					eq(clinicSlots.clinicianStaffId, input.clinicianStaffId),
					eq(clinicSlots.slotDate, input.appointmentDate),
					eq(clinicSlots.slotStartTime, input.appointmentTime)
				)
			)
			.limit(1)

		if (existingSlot) {
			return existingSlot.id
		}

		const dayOfWeek = new Date(`${input.appointmentDate}T00:00:00.000Z`).getUTCDay()
		const [template] = await db
			.select({ id: clinicTemplates.id })
			.from(clinicTemplates)
			.where(
				and(
					eq(clinicTemplates.facilityId, input.facilityId),
					eq(clinicTemplates.clinicianStaffId, input.clinicianStaffId),
					eq(clinicTemplates.dayOfWeek, dayOfWeek),
					eq(clinicTemplates.isActive, true),
					sql`${clinicTemplates.startTime} <= ${input.appointmentTime}`,
					sql`${clinicTemplates.endTime} > ${input.appointmentTime}`
				)
			)
			.limit(1)

		if (!template) {
			return undefined
		}

		await this.slotGenerator.generateSlotsForTemplate(
			template.id,
			input.appointmentDate,
			input.appointmentDate
		)

		const [generatedSlot] = await db
			.select({ id: clinicSlots.id })
			.from(clinicSlots)
			.where(
				and(
					eq(clinicSlots.clinicianStaffId, input.clinicianStaffId),
					eq(clinicSlots.slotDate, input.appointmentDate),
					eq(clinicSlots.slotStartTime, input.appointmentTime)
				)
			)
			.limit(1)

		return generatedSlot?.id
	}

	private async createAppointmentWithoutSlot(input: CreateAppointmentInput, session: UserSession) {
		const [conflict] = await db
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.clinicianStaffId, input.clinicianStaffId),
					eq(appointments.appointmentDate, input.appointmentDate),
					eq(appointments.appointmentTime, input.appointmentTime),
					sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
				)
			)
			.limit(1)

		if (conflict) {
			throw new ConflictException(
				`Time slot ${input.appointmentTime} on ${input.appointmentDate} is already booked`
			)
		}

		const queueNumber = await this.getNextQueueNumber(db, input.facilityId, input.appointmentDate)
		const bookedByStaffId = await this.findBookedByStaffProfileId(db, session.user.id)

		const [created] = await db
			.insert(appointments)
			.values({
				facilityId: input.facilityId,
				clinicTemplateId: input.clinicTemplateId,
				clinicSlotId: null,
				patientId: input.patientId,
				clinicianStaffId: input.clinicianStaffId,
				appointmentDate: input.appointmentDate,
				appointmentTime: input.appointmentTime,
				queueNumber,
				encounterType: input.encounterType ?? "outpatient",
				chiefComplaint: input.chiefComplaint,
				notes: input.notes,
				bookedByStaffId,
			})
			.returning()

		return created!
	}

	private async getNextQueueNumber(
		client: Pick<typeof db, "select">,
		facilityId: string,
		appointmentDate: string
	): Promise<number> {
		const [queueResult] = await client
			.select({ maxQueue: sql<number>`COALESCE(MAX(${appointments.queueNumber}), 0)` })
			.from(appointments)
			.where(
				and(
					eq(appointments.facilityId, facilityId),
					eq(appointments.appointmentDate, appointmentDate)
				)
			)

		return (queueResult?.maxQueue ?? 0) + 1
	}

	private async getNextEncounterQueueNumber(
		client: Pick<typeof db, "select">,
		facilityId: string,
		clinicianStaffId: string,
		checkedInAt: Date
	): Promise<number> {
		const dayStart = new Date(checkedInAt)
		dayStart.setUTCHours(0, 0, 0, 0)
		const nextDayStart = new Date(dayStart)
		nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1)

		const [queueResult] = await client
			.select({ maxQueue: sql<number>`COALESCE(MAX(${encounters.queueNumber}), 0)` })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, facilityId),
					eq(encounters.encounterType, sql`'outpatient'`),
					eq(encounters.clinicianStaffId, clinicianStaffId),
					gte(encounters.admissionDatetime, dayStart),
					lt(encounters.admissionDatetime, nextDayStart)
				)
			)

		return (queueResult?.maxQueue ?? 0) + 1
	}

	private async findBookedByStaffProfileId(
		client: Pick<typeof db, "select">,
		userId: string
	): Promise<string | undefined> {
		const [staffProfile] = await client
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)

		return staffProfile?.id
	}

	private async listAvailableSlotRows(
		clinicianId: string,
		date: string,
		facilityId?: string
	): Promise<Array<{ slotId: string; time: string; available: boolean }>> {
		const conditions: SQL[] = [
			eq(clinicSlots.clinicianStaffId, clinicianId),
			eq(clinicSlots.slotDate, date),
			sql`${clinicSlots.status} IN ('open', 'booked')`,
		]

		if (facilityId) {
			conditions.push(eq(clinicSlots.facilityId, facilityId))
		}

		const rows = await db
			.select({
				slotId: clinicSlots.id,
				time: clinicSlots.slotStartTime,
				available: sql<boolean>`${clinicSlots.status} = 'open'`,
			})
			.from(clinicSlots)
			.where(and(...conditions))
			.orderBy(clinicSlots.slotStartTime)

		return rows.map(row => ({
			slotId: row.slotId,
			time: this.normalizeTime(row.time),
			available: Boolean(row.available),
		}))
	}

	private normalizeClinicSlot(row: typeof clinicSlots.$inferSelect) {
		return {
			...row,
			slotStartTime: this.normalizeTime(row.slotStartTime),
			slotEndTime: this.normalizeTime(row.slotEndTime),
		}
	}

	private normalizeTime(time: string): string {
		return time.slice(0, 5)
	}

	private addDays(date: string, days: number): string {
		const next = new Date(`${date}T00:00:00.000Z`)
		next.setUTCDate(next.getUTCDate() + days)
		return next.toISOString().slice(0, 10)
	}

	private validateTemplateSchedule(
		startTime: string,
		endTime: string,
		slotDurationMinutes: number
	): void {
		if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
			throw new BadRequestException("Clinic template endTime must be later than startTime")
		}

		if (
			!ALLOWED_SLOT_DURATIONS.includes(
				slotDurationMinutes as (typeof ALLOWED_SLOT_DURATIONS)[number]
			)
		) {
			throw new BadRequestException(
				`slotDurationMinutes must be one of: ${ALLOWED_SLOT_DURATIONS.join(", ")}`
			)
		}
	}

	private async assertClinicianBelongsToFacility(
		clinicianStaffId: string,
		facilityId: string
	): Promise<void> {
		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.id, clinicianStaffId), eq(staffProfiles.facilityId, facilityId)))
			.limit(1)

		if (!row) {
			throw new BadRequestException("Clinician does not belong to the selected facility")
		}
	}

	private async resolveActorStaffProfileId(actor: SchedulingActor): Promise<string | null> {
		if (actor.staffProfileId) {
			return actor.staffProfileId
		}

		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.userId, actor.userId), eq(staffProfiles.facilityId, actor.facilityId))
			)
			.limit(1)

		return row?.id ?? null
	}

	private diffCreatedTemplate(row: ClinicTemplateRow): FieldChange[] {
		return [
			{ path: "facilityId", before: null, after: row.facilityId },
			{ path: "clinicianStaffId", before: null, after: row.clinicianStaffId },
			{ path: "clinicName", before: null, after: row.clinicName },
			{ path: "dayOfWeek", before: null, after: row.dayOfWeek },
			{ path: "startTime", before: null, after: row.startTime },
			{ path: "endTime", before: null, after: row.endTime },
			{ path: "maxPatients", before: null, after: row.maxPatients },
			{ path: "slotDurationMinutes", before: null, after: row.slotDurationMinutes },
			{ path: "isActive", before: null, after: row.isActive },
		]
	}

	private diffUpdatedTemplate(
		existing: ClinicTemplateRow,
		input: UpdateClinicTemplateInput
	): FieldChange[] {
		const changes: FieldChange[] = []
		const mutableFields = [
			"clinicName",
			"startTime",
			"endTime",
			"maxPatients",
			"slotDurationMinutes",
			"isActive",
		] as const

		for (const field of mutableFields) {
			if (!(field in input)) continue
			const nextValue = input[field]
			if (nextValue !== undefined && existing[field] !== nextValue) {
				changes.push({ path: field, before: existing[field], after: nextValue })
			}
		}

		return changes
	}

	private shouldRegenerateTemplate(
		existing: ClinicTemplateRow,
		input: UpdateClinicTemplateInput
	): boolean {
		if (input.isActive === true && existing.isActive === false) {
			return false
		}

		return REGENERATIVE_TEMPLATE_FIELDS.some(field => {
			const nextValue = input[field]
			return nextValue !== undefined && nextValue !== existing[field]
		})
	}

	private async generateSlotsForTemplate(templateId: string): Promise<void> {
		const fromDate = this.todayDateString()
		const toDate = this.addDays(fromDate, this.slotWindowDays)
		await this.slotGenerator.generateSlotsForTemplate(templateId, fromDate, toDate)
	}
}
