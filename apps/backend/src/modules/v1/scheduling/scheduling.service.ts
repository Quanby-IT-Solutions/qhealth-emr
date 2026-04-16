import {
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm"
import type { UserSession } from "@thallesp/nestjs-better-auth"

import { appointments, clinicTemplates, patients, staffProfiles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type ClinicTemplateListInput = V1Inputs["scheduling"]["listClinicTemplates"]
type CreateClinicTemplateInput = V1Inputs["scheduling"]["createClinicTemplate"]
type UpdateClinicTemplateInput = V1Inputs["scheduling"]["updateClinicTemplate"]
type AppointmentListInput = V1Inputs["scheduling"]["listAppointments"]
type CreateAppointmentInput = V1Inputs["scheduling"]["createAppointment"]
type CheckInAppointmentInput = V1Inputs["scheduling"]["checkInAppointment"]
type UpdateAppointmentStatusInput = V1Inputs["scheduling"]["updateAppointmentStatus"]
type AvailableSlotsInput = V1Inputs["scheduling"]["getAvailableSlots"]
type ClinicQueueInput = V1Inputs["scheduling"]["getClinicQueue"]

@Injectable()
export class SchedulingService {
	private readonly logger = new Logger(SchedulingService.name)

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

	async createClinicTemplate(input: CreateClinicTemplateInput) {
		const [created] = await db
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

		this.logger.log(`Created clinic template: ${input.clinicName}`)
		return created!
	}

	async updateClinicTemplate(input: UpdateClinicTemplateInput) {
		const [existing] = await db
			.select()
			.from(clinicTemplates)
			.where(eq(clinicTemplates.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Clinic template ${input.id} not found`)
		}

		const [updated] = await db
			.update(clinicTemplates)
			.set({
				clinicName: input.clinicName ?? existing.clinicName,
				startTime: input.startTime ?? existing.startTime,
				endTime: input.endTime ?? existing.endTime,
				maxPatients: input.maxPatients ?? existing.maxPatients,
				slotDurationMinutes: input.slotDurationMinutes ?? existing.slotDurationMinutes,
				isActive: input.isActive ?? existing.isActive,
				updatedAt: new Date(),
			})
			.where(eq(clinicTemplates.id, input.id))
			.returning()

		return updated!
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
		// Check for conflicting appointment (same clinician, date, time)
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

		if (conflict) {
			throw new ConflictException(
				`Time slot ${input.appointmentTime} on ${input.appointmentDate} is already booked`
			)
		}

		// Get next queue number for the date
		const [queueResult] = await db
			.select({ maxQueue: sql<number>`COALESCE(MAX(${appointments.queueNumber}), 0)` })
			.from(appointments)
			.where(
				and(
					eq(appointments.facilityId, input.facilityId),
					eq(appointments.appointmentDate, input.appointmentDate)
				)
			)

		const queueNumber = (queueResult?.maxQueue ?? 0) + 1

		// Get bookedByStaffId from session
		const [staffProfile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, session.user.id))

		const [created] = await db
			.insert(appointments)
			.values({
				facilityId: input.facilityId,
				clinicTemplateId: input.clinicTemplateId,
				patientId: input.patientId,
				clinicianStaffId: input.clinicianStaffId,
				appointmentDate: input.appointmentDate,
				appointmentTime: input.appointmentTime,
				queueNumber,
				encounterType: input.encounterType ?? "outpatient",
				chiefComplaint: input.chiefComplaint,
				notes: input.notes,
				bookedByStaffId: staffProfile?.id,
			})
			.returning()

		this.logger.log(`Created appointment ${created!.id} for patient ${input.patientId}`)
		return created!
	}

	async checkInAppointment(input: CheckInAppointmentInput) {
		const [existing] = await db
			.select()
			.from(appointments)
			.where(eq(appointments.id, input.id))

		if (!existing) {
			throw new NotFoundException(`Appointment ${input.id} not found`)
		}

		if (existing.status !== "booked") {
			throw new ConflictException(
				`Cannot check in appointment with status "${existing.status}"`
			)
		}

		// Get next queue number if not already assigned
		let queueNumber = existing.queueNumber
		if (!queueNumber) {
			const [queueResult] = await db
				.select({ maxQueue: sql<number>`COALESCE(MAX(${appointments.queueNumber}), 0)` })
				.from(appointments)
				.where(
					and(
						eq(appointments.facilityId, existing.facilityId),
						eq(appointments.appointmentDate, existing.appointmentDate)
					)
				)
			queueNumber = (queueResult?.maxQueue ?? 0) + 1
		}

		const [updated] = await db
			.update(appointments)
			.set({
				status: "checked_in",
				checkedInAt: new Date(),
				queueNumber,
				updatedAt: new Date(),
			})
			.where(eq(appointments.id, input.id))
			.returning()

		this.logger.log(`Checked in appointment ${input.id}, queue number: ${queueNumber}`)

		return {
			appointment: updated!,
			queueNumber: queueNumber!,
		}
	}

	async updateAppointmentStatus(input: UpdateAppointmentStatusInput) {
		const [existing] = await db
			.select()
			.from(appointments)
			.where(eq(appointments.id, input.id))

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

		const [updated] = await db
			.update(appointments)
			.set(updateData)
			.where(eq(appointments.id, input.id))
			.returning()

		this.logger.log(`Updated appointment ${input.id} status to ${input.status}`)
		return updated!
	}

	// ========================================================================
	// Availability & Queue
	// ========================================================================

	async getAvailableSlots(input: AvailableSlotsInput) {
		// Get the clinic template for this clinician
		const dayOfWeek = new Date(input.date).getDay()

		// Support both clinicianStaffId and clinicianId as aliases
		const clinicianId = input.clinicianStaffId || input.clinicianId

		if (!clinicianId) {
			// If no clinician specified, return empty slots
			return { slots: [], clinicName: null }
		}

		const templates = await db
			.select()
			.from(clinicTemplates)
			.where(
				and(
					eq(clinicTemplates.clinicianStaffId, clinicianId),
					eq(clinicTemplates.dayOfWeek, dayOfWeek),
					eq(clinicTemplates.isActive, true)
				)
			)

		if (templates.length === 0) {
			return { slots: [], clinicName: null }
		}

		const template = templates[0]!

		// Get existing appointments for the date
		const existingAppointments = await db
			.select({ time: appointments.appointmentTime })
			.from(appointments)
			.where(
				and(
					eq(appointments.clinicianStaffId, clinicianId),
					eq(appointments.appointmentDate, input.date),
					sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
				)
			)

		const bookedTimes = new Set(existingAppointments.map(a => a.time))

		// Generate time slots
		const slots: Array<{ time: string; available: boolean }> = []
		const startMinutes = this.timeToMinutes(template.startTime)
		const endMinutes = this.timeToMinutes(template.endTime)
		const slotDuration = template.slotDurationMinutes

		for (let mins = startMinutes; mins < endMinutes; mins += slotDuration) {
			const time = this.minutesToTime(mins)
			slots.push({
				time,
				available: !bookedTimes.has(time),
			})
		}

		return {
			slots,
			clinicName: template.clinicName,
		}
	}

	async getClinicQueue(input: ClinicQueueInput) {
		const conditions: SQL[] = [
			eq(appointments.appointmentDate, input.date),
		]

		// Support either facilityId or clinicId
		const theFacilityId = input.facilityId ?? input.clinicId
		if (theFacilityId) {
			conditions.push(eq(appointments.facilityId, theFacilityId))
		}

		if (input.clinicianStaffId) {
			conditions.push(eq(appointments.clinicianStaffId, input.clinicianStaffId))
		}

		const rows = await db
			.select({
				id: appointments.id,
				queueNumber: appointments.queueNumber,
				appointmentTime: appointments.appointmentTime,
				status: appointments.status,
				checkedInAt: appointments.checkedInAt,
				patientId: appointments.patientId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				clinicianStaffId: appointments.clinicianStaffId,
				clinicianName: users.name,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.leftJoin(staffProfiles, eq(appointments.clinicianStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(and(...conditions))
			.orderBy(appointments.queueNumber, appointments.appointmentTime)

		const queue = rows.map(row => ({
			id: row.id,
			queueNumber: row.queueNumber,
			appointmentTime: row.appointmentTime,
			status: row.status,
			checkedInAt: row.checkedInAt,
			patientId: row.patientId,
			patientName: row.patientFirstName
				? `${row.patientLastName}, ${row.patientFirstName}`
				: undefined,
			patientMrn: row.patientMrn ?? undefined,
			clinicianStaffId: row.clinicianStaffId,
			clinicianName: row.clinicianName ?? undefined,
		}))

		// Calculate stats
		const booked = queue.filter(q => q.status === "booked").length
		const checkedIn = queue.filter(q => q.status === "checked_in").length
		const inProgress = queue.filter(q => q.status === "in_progress").length
		const completed = queue.filter(q => q.status === "completed").length

		return {
			queue,
			stats: {
				booked,
				checkedIn,
				inProgress,
				completed,
				total: queue.length,
			},
		}
	}

	// ========================================================================
	// Helpers
	// ========================================================================

	private timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(":").map(Number)
		return hours! * 60 + minutes!
	}

	private minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
	}
}
