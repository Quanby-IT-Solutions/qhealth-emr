import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

import {
	encounters,
	facilities,
	patients,
	staffProfiles,
	telemedicineAbstracts,
	telemedicineAppointments,
	telemedicineEncounters,
	telemedicinePrescriptionItems,
	telemedicinePrescriptions,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { NotificationService } from "@/modules/v1/notifications/notification.service"

import { assertTelemedicineVideoLink } from "./telemedicine-video-link"

type ListAppointmentsInput = V1Inputs["telemedicine"]["listAppointments"]
type GetAppointmentInput = V1Inputs["telemedicine"]["getAppointment"]
type CreateAppointmentInput = V1Inputs["telemedicine"]["createAppointment"]
type UpdateAppointmentInput = V1Inputs["telemedicine"]["updateAppointment"]
type CancelAppointmentInput = V1Inputs["telemedicine"]["cancelAppointment"]
type GetEncounterInput = V1Inputs["telemedicine"]["getEncounter"]
type CreateEncounterInput = V1Inputs["telemedicine"]["createEncounter"]
type GetPrescriptionInput = V1Inputs["telemedicine"]["getPrescription"]
type ListPrescriptionsInput = V1Inputs["telemedicine"]["listPrescriptions"]
type CreatePrescriptionInput = V1Inputs["telemedicine"]["createPrescription"]
type SignPrescriptionInput = V1Inputs["telemedicine"]["signPrescription"]
type GenerateAbstractInput = V1Inputs["telemedicine"]["generateAbstract"]
type GetAbstractInput = V1Inputs["telemedicine"]["getAbstract"]
type ListEncounterAbstractsInput = V1Inputs["telemedicine"]["listEncounterAbstracts"]
type SignAbstractInput = V1Inputs["telemedicine"]["signAbstract"]
type SendAbstractInput = V1Inputs["telemedicine"]["sendAbstract"]
type SendPrescriptionInput = V1Inputs["telemedicine"]["sendPrescription"]

@Injectable()
export class TelemedicineService {
	private readonly logger = new Logger(TelemedicineService.name)

	constructor(private readonly notificationService: NotificationService) {}

	// =========================================================================
	// Private helpers
	// =========================================================================

	private buildAppointmentRow(
		appt: typeof telemedicineAppointments.$inferSelect,
		patientRow: {
			firstName: string
			lastName: string
			mrn: string
			phone: string | null
			email: string | null
		},
		clinicianName: string,
		clinicianSpecialty: string,
		createdByName: string
	) {
		return {
			id: appt.id,
			facilityId: appt.facilityId,
			patientId: appt.patientId,
			patientName: `${patientRow.lastName}, ${patientRow.firstName}`,
			patientMrn: patientRow.mrn,
			patientContactNumber: patientRow.phone ?? "",
			patientEmail: patientRow.email ?? null,
			clinicianId: appt.clinicianStaffId,
			clinicianName,
			clinicianSpecialty,
			scheduledDate: appt.scheduledDate,
			scheduledTime: appt.scheduledTime,
			durationMinutes: appt.durationMinutes,
			platform: appt.platform,
			status: appt.status,
			videoLink: appt.videoLink ?? null,
			meetingId: appt.meetingId ?? null,
			meetingPassword: appt.meetingPassword ?? null,
			notes: appt.notes ?? null,
			encounterId: appt.encounterId ?? null,
			createdAt: appt.createdAt.toISOString(),
			createdByName,
		}
	}

	private assertAssignedClinician(
		requestingStaffId: string | undefined,
		assignedStaffId: string,
		action: string
	) {
		if (!requestingStaffId) {
			throw new ForbiddenException(`Unable to verify clinician assignment for ${action}.`)
		}
		if (requestingStaffId !== assignedStaffId) {
			throw new ForbiddenException(`Only the assigned clinician can ${action}.`)
		}
	}

	private assertFutureAppointment(scheduledDate: string, scheduledTime: string) {
		const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
		if (!Number.isFinite(scheduledAt.getTime())) {
			throw new BadRequestException("Appointment date and time are invalid.")
		}
		if (scheduledAt.getTime() <= Date.now()) {
			throw new BadRequestException("Appointment date and time must be in the future.")
		}
	}

	private async assertAppointmentScope(input: CreateAppointmentInput) {
		const [patient] = await db
			.select({
				id: patients.id,
				facilityId: patients.facilityId,
				isActive: patients.isActive,
			})
			.from(patients)
			.where(eq(patients.id, input.patientId))
			.limit(1)

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found.`)
		}
		if (patient.facilityId !== input.facilityId) {
			throw new BadRequestException("Patient must belong to the appointment facility.")
		}
		if (!patient.isActive) {
			throw new BadRequestException("Cannot book a telemedicine appointment for an inactive patient.")
		}

		const [clinician] = await db
			.select({
				id: staffProfiles.id,
				facilityId: staffProfiles.facilityId,
				isActive: staffProfiles.isActive,
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, input.clinicianId))
			.limit(1)

		if (!clinician) {
			throw new NotFoundException(`Clinician staff profile ${input.clinicianId} not found.`)
		}
		if (clinician.facilityId !== input.facilityId) {
			throw new BadRequestException("Clinician must belong to the appointment facility.")
		}
		if (!clinician.isActive) {
			throw new BadRequestException("Cannot book a telemedicine appointment with an inactive clinician.")
		}
	}

	private async getPrescribingStaff(staffProfileId: string | undefined) {
		if (!staffProfileId) {
			throw new ForbiddenException("Unable to verify prescribing clinician.")
		}

		const [staff] = await db
			.select({
				id: staffProfiles.id,
				prcLicenseNumber: staffProfiles.prcLicenseNumber,
				prcExpiry: staffProfiles.prcExpiry,
				ptrNumber: staffProfiles.ptrNumber,
				ptrExpiry: staffProfiles.ptrExpiry,
				isActive: staffProfiles.isActive,
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))
			.limit(1)

		if (!staff) {
			throw new NotFoundException("Prescribing staff profile not found.")
		}
		if (!staff.isActive) {
			throw new BadRequestException("Prescribing staff profile is inactive.")
		}

		this.assertActivePrescriberCredentials(staff)
		return staff
	}

	private async getClinicalSigningStaff(staffProfileId: string | undefined) {
		if (!staffProfileId) {
			throw new ForbiddenException("Unable to verify signing clinician.")
		}

		const [staff] = await db
			.select({
				id: staffProfiles.id,
				prcLicenseNumber: staffProfiles.prcLicenseNumber,
				prcExpiry: staffProfiles.prcExpiry,
				isActive: staffProfiles.isActive,
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))
			.limit(1)

		if (!staff) {
			throw new NotFoundException("Signing staff profile not found.")
		}
		if (!staff.isActive) {
			throw new BadRequestException("Signing staff profile is inactive.")
		}
		if (!staff.prcLicenseNumber) {
			throw new BadRequestException("Signing clinician does not have a PRC license number.")
		}

		this.assertCredentialNotExpired("PRC license", staff.prcExpiry)
		return staff
	}

	private assertActivePrescriberCredentials(staff: {
		prcLicenseNumber?: string | null
		prcExpiry?: string | Date | null
		ptrNumber?: string | null
		ptrExpiry?: string | Date | null
	}) {
		if (!staff.prcLicenseNumber) {
			throw new BadRequestException("Prescriber does not have a PRC license number.")
		}
		if (!staff.ptrNumber) {
			throw new BadRequestException("Prescriber does not have a PTR number.")
		}
		this.assertCredentialNotExpired("PRC license", staff.prcExpiry)
		this.assertCredentialNotExpired("PTR number", staff.ptrExpiry)
	}

	private assertCredentialNotExpired(label: string, expiresAt?: string | Date | null) {
		if (!expiresAt) {
			throw new BadRequestException(`Physician ${label} expiry is not recorded.`)
		}

		const expiryDate = new Date(expiresAt)
		expiryDate.setHours(0, 0, 0, 0)

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		if (expiryDate < today) {
			throw new BadRequestException(`Physician ${label} is expired.`)
		}
	}

	// =========================================================================
	// List Appointments
	// =========================================================================

	async listAppointments(input: ListAppointmentsInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 20
		const offset = (page - 1) * limit

		const conditions = [eq(telemedicineAppointments.facilityId, input.facilityId)]
		if (input.status) {
			conditions.push(eq(telemedicineAppointments.status, input.status))
		}
		const whereClause = and(...conditions)

		// Subquery aliases for clinician and created-by staff
		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name, department: staffProfiles.department })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const createdByStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("created_by_staff")

		const [rows, totalResult] = await Promise.all([
			db
				.select({
					id: telemedicineAppointments.id,
					facilityId: telemedicineAppointments.facilityId,
					patientId: telemedicineAppointments.patientId,
					clinicianStaffId: telemedicineAppointments.clinicianStaffId,
					scheduledDate: telemedicineAppointments.scheduledDate,
					scheduledTime: telemedicineAppointments.scheduledTime,
					durationMinutes: telemedicineAppointments.durationMinutes,
					platform: telemedicineAppointments.platform,
					status: telemedicineAppointments.status,
					videoLink: telemedicineAppointments.videoLink,
					meetingId: telemedicineAppointments.meetingId,
					meetingPassword: telemedicineAppointments.meetingPassword,
					notes: telemedicineAppointments.notes,
					teleEncounterId: telemedicineEncounters.id,
					createdAt: telemedicineAppointments.createdAt,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMrn: patients.mrn,
					patientPhone: patients.phone,
					patientEmail: patients.email,
					clinicianName: clinicianStaff.name,
					clinicianSpecialty: clinicianStaff.department,
					createdByName: createdByStaff.name,
				})
				.from(telemedicineAppointments)
				.leftJoin(
					telemedicineEncounters,
					eq(telemedicineEncounters.appointmentId, telemedicineAppointments.id)
				)
				.innerJoin(patients, eq(telemedicineAppointments.patientId, patients.id))
				.leftJoin(clinicianStaff, eq(telemedicineAppointments.clinicianStaffId, clinicianStaff.id))
				.leftJoin(createdByStaff, eq(telemedicineAppointments.createdByStaffId, createdByStaff.id))
				.where(whereClause)
				.orderBy(
					desc(telemedicineAppointments.scheduledDate),
					desc(telemedicineAppointments.scheduledTime)
				)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(telemedicineAppointments).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		const data = rows.map(r => ({
			id: r.id,
			facilityId: r.facilityId,
			patientId: r.patientId,
			patientName: `${r.patientLastName}, ${r.patientFirstName}`,
			patientMrn: r.patientMrn,
			patientContactNumber: r.patientPhone ?? "",
			patientEmail: r.patientEmail ?? null,
			clinicianId: r.clinicianStaffId,
			clinicianName: r.clinicianName ?? "",
			clinicianSpecialty: r.clinicianSpecialty ?? "",
			scheduledDate: r.scheduledDate,
			scheduledTime: r.scheduledTime,
			durationMinutes: r.durationMinutes,
			platform: r.platform,
			status: r.status,
			videoLink: r.videoLink ?? null,
			meetingId: r.meetingId ?? null,
			meetingPassword: r.meetingPassword ?? null,
			notes: r.notes ?? null,
			encounterId: r.teleEncounterId ?? null,
			createdAt: r.createdAt.toISOString(),
			createdByName: r.createdByName ?? "",
		}))

		return { data, total, page, limit }
	}

	// =========================================================================
	// Get Appointment
	// =========================================================================

	async getAppointment(input: GetAppointmentInput) {
		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name, department: staffProfiles.department })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const createdByStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("created_by_staff")

		const [row] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				patientId: telemedicineAppointments.patientId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				scheduledDate: telemedicineAppointments.scheduledDate,
				scheduledTime: telemedicineAppointments.scheduledTime,
				durationMinutes: telemedicineAppointments.durationMinutes,
				platform: telemedicineAppointments.platform,
				status: telemedicineAppointments.status,
				videoLink: telemedicineAppointments.videoLink,
				meetingId: telemedicineAppointments.meetingId,
				meetingPassword: telemedicineAppointments.meetingPassword,
				notes: telemedicineAppointments.notes,
				teleEncounterId: telemedicineEncounters.id,
				createdAt: telemedicineAppointments.createdAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientPhone: patients.phone,
				patientEmail: patients.email,
				clinicianName: clinicianStaff.name,
				clinicianSpecialty: clinicianStaff.department,
				createdByName: createdByStaff.name,
			})
			.from(telemedicineAppointments)
			.leftJoin(
				telemedicineEncounters,
				eq(telemedicineEncounters.appointmentId, telemedicineAppointments.id)
			)
			.innerJoin(patients, eq(telemedicineAppointments.patientId, patients.id))
			.leftJoin(clinicianStaff, eq(telemedicineAppointments.clinicianStaffId, clinicianStaff.id))
			.leftJoin(createdByStaff, eq(telemedicineAppointments.createdByStaffId, createdByStaff.id))
			.where(eq(telemedicineAppointments.id, input.id))

		if (!row) {
			throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
		}

		return {
			id: row.id,
			facilityId: row.facilityId,
			patientId: row.patientId,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			patientMrn: row.patientMrn,
			patientContactNumber: row.patientPhone ?? "",
			patientEmail: row.patientEmail ?? null,
			clinicianId: row.clinicianStaffId,
			clinicianName: row.clinicianName ?? "",
			clinicianSpecialty: row.clinicianSpecialty ?? "",
			scheduledDate: row.scheduledDate,
			scheduledTime: row.scheduledTime,
			durationMinutes: row.durationMinutes,
			platform: row.platform,
			status: row.status,
			videoLink: row.videoLink ?? null,
			meetingId: row.meetingId ?? null,
			meetingPassword: row.meetingPassword ?? null,
			notes: row.notes ?? null,
			encounterId: row.teleEncounterId ?? null,
			createdAt: row.createdAt.toISOString(),
			createdByName: row.createdByName ?? "",
		}
	}

	// =========================================================================
	// Create Appointment
	// =========================================================================

	async createAppointment(input: CreateAppointmentInput, createdByStaffId?: string) {
		this.assertFutureAppointment(input.scheduledDate, input.scheduledTime)
		await this.assertAppointmentScope(input)
		assertTelemedicineVideoLink(input.videoLink, input.platform)

		const [created] = await db
			.insert(telemedicineAppointments)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				clinicianStaffId: input.clinicianId,
				scheduledDate: input.scheduledDate,
				scheduledTime: input.scheduledTime,
				durationMinutes: input.durationMinutes,
				platform: input.platform,
				videoLink: input.videoLink ?? null,
				meetingId: input.meetingId ?? null,
				meetingPassword: input.meetingPassword ?? null,
				notes: input.notes ?? null,
				createdByStaffId: createdByStaffId ?? null,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create telemedicine appointment")
		}

		this.logger.log(`Created telemedicine appointment: ${created.id}`)
		return this.getAppointment({ id: created.id })
	}

	async updateAppointment(input: UpdateAppointmentInput, updatedByStaffId?: string) {
		const [appt] = await db
			.select()
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, input.id))

		if (!appt) {
			throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
		}

		this.assertAssignedClinician(updatedByStaffId, appt.clinicianStaffId, "update this appointment")

		if ("videoLink" in input) {
			assertTelemedicineVideoLink(input.videoLink, appt.platform)
		}

		const updates: Partial<typeof telemedicineAppointments.$inferInsert> = {
			updatedAt: new Date(),
		}
		if ("videoLink" in input) updates.videoLink = input.videoLink ?? null
		if ("meetingId" in input) updates.meetingId = input.meetingId ?? null
		if ("meetingPassword" in input) updates.meetingPassword = input.meetingPassword ?? null

		const [updated] = await db
			.update(telemedicineAppointments)
			.set(updates)
			.where(eq(telemedicineAppointments.id, input.id))
			.returning({ id: telemedicineAppointments.id })

		if (!updated) {
			throw new Error("Failed to update telemedicine appointment")
		}

		this.logger.log(`Updated telemedicine appointment: ${input.id}`)
		return this.getAppointment({ id: input.id })
	}

	// =========================================================================
	// Cancel Appointment
	// =========================================================================

	async cancelAppointment(input: CancelAppointmentInput) {
		const [appt] = await db
			.select()
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, input.id))

		if (!appt) {
			throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
		}

		await db
			.update(telemedicineAppointments)
			.set({
				status: "cancelled",
				cancelledAt: new Date(),
				cancellationReason: input.cancellationReason ?? null,
				updatedAt: new Date(),
			})
			.where(eq(telemedicineAppointments.id, input.id))

		this.logger.log(`Cancelled telemedicine appointment: ${input.id}`)
	}

	// =========================================================================
	// Get Encounter
	// =========================================================================

	async getEncounter(input: GetEncounterInput) {
		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const signedByStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("signed_by_staff")

		const [row] = await db
			.select({
				id: telemedicineEncounters.id,
				appointmentId: telemedicineEncounters.appointmentId,
				encounterType: telemedicineEncounters.encounterType,
				linkedEncounterId: telemedicineEncounters.linkedEncounterId,
				patientId: telemedicineEncounters.patientId,
				clinicianStaffId: telemedicineEncounters.clinicianStaffId,
				chiefComplaint: telemedicineEncounters.chiefComplaint,
				subjectiveNotes: telemedicineEncounters.subjectiveNotes,
				objectiveNotes: telemedicineEncounters.objectiveNotes,
				assessmentNotes: telemedicineEncounters.assessmentNotes,
				planNotes: telemedicineEncounters.planNotes,
				diagnosis: telemedicineEncounters.diagnosis,
				icdCode: telemedicineEncounters.icdCode,
				vitalSigns: telemedicineEncounters.vitalSigns,
				status: telemedicineEncounters.status,
				signedAt: telemedicineEncounters.signedAt,
				createdAt: telemedicineEncounters.createdAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				clinicianName: clinicianStaff.name,
				signedByName: signedByStaff.name,
			})
			.from(telemedicineEncounters)
			.innerJoin(patients, eq(telemedicineEncounters.patientId, patients.id))
			.leftJoin(clinicianStaff, eq(telemedicineEncounters.clinicianStaffId, clinicianStaff.id))
			.leftJoin(signedByStaff, eq(telemedicineEncounters.signedByStaffId, signedByStaff.id))
			.where(eq(telemedicineEncounters.id, input.id))

		if (!row) {
			throw new NotFoundException(`Telemedicine encounter ${input.id} not found`)
		}

		// Resolve linked encounter number if applicable
		let linkedEncounterNumber: string | null = null
		if (row.linkedEncounterId) {
			const [linkedEnc] = await db
				.select({ id: encounters.id })
				.from(encounters)
				.where(eq(encounters.id, row.linkedEncounterId))
			linkedEncounterNumber = linkedEnc ? `ENC-${linkedEnc.id.slice(0, 8).toUpperCase()}` : null
		}

		return {
			id: row.id,
			appointmentId: row.appointmentId,
			encounterType: row.encounterType,
			linkedEncounterId: row.linkedEncounterId ?? null,
			linkedEncounterNumber,
			patientId: row.patientId,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			clinicianId: row.clinicianStaffId,
			clinicianName: row.clinicianName ?? "",
			chiefComplaint: row.chiefComplaint,
			subjectiveNotes: row.subjectiveNotes,
			objectiveNotes: row.objectiveNotes,
			assessmentNotes: row.assessmentNotes,
			planNotes: row.planNotes,
			diagnosis: row.diagnosis,
			icdCode: row.icdCode ?? null,
			vitalSigns: row.vitalSigns ?? {},
			status: row.status,
			createdAt: row.createdAt.toISOString(),
			signedAt: row.signedAt?.toISOString() ?? null,
			signedByName: row.signedByName ?? null,
		}
	}

	// =========================================================================
	// Create Encounter
	// =========================================================================

	async createEncounter(input: CreateEncounterInput, createdByStaffId?: string) {
		// Resolve appointment to get patient and clinician
		const [appt] = await db
			.select()
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, input.appointmentId))

		if (!appt) {
			throw new NotFoundException(`Telemedicine appointment ${input.appointmentId} not found`)
		}

		this.assertAssignedClinician(createdByStaffId, appt.clinicianStaffId, "start this encounter")

		if (appt.status === "cancelled" || appt.status === "no-show" || appt.status === "completed") {
			throw new BadRequestException(`Cannot start an encounter for a ${appt.status} appointment.`)
		}

		const [existingEncounter] = await db
			.select({ id: telemedicineEncounters.id })
			.from(telemedicineEncounters)
			.where(eq(telemedicineEncounters.appointmentId, input.appointmentId))
			.limit(1)

		if (existingEncounter) {
			throw new BadRequestException("A telemedicine encounter already exists for this appointment.")
		}

		if (input.linkedEncounterId) {
			const [linkedEncounter] = await db
				.select({
					id: encounters.id,
					facilityId: encounters.facilityId,
					patientId: encounters.patientId,
				})
				.from(encounters)
				.where(eq(encounters.id, input.linkedEncounterId))
				.limit(1)

			if (!linkedEncounter) {
				throw new NotFoundException(`Linked encounter ${input.linkedEncounterId} not found`)
			}
			if (
				linkedEncounter.facilityId !== appt.facilityId ||
				linkedEncounter.patientId !== appt.patientId
			) {
				throw new BadRequestException(
					"Linked encounter must belong to the same facility and patient."
				)
			}
		}

		const [created] = await db
			.insert(telemedicineEncounters)
			.values({
				appointmentId: input.appointmentId,
				encounterType: input.encounterType,
				linkedEncounterId: input.linkedEncounterId ?? null,
				patientId: appt.patientId,
				clinicianStaffId: appt.clinicianStaffId,
				chiefComplaint: input.chiefComplaint,
				subjectiveNotes: input.subjectiveNotes,
				objectiveNotes: input.objectiveNotes,
				assessmentNotes: input.assessmentNotes,
				planNotes: input.planNotes,
				diagnosis: input.diagnosis,
				icdCode: input.icdCode ?? null,
				vitalSigns: input.vitalSigns ?? null,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create telemedicine encounter")
		}

		// Link encounter back to appointment
		await db
			.update(telemedicineAppointments)
			.set({ status: "in-progress", updatedAt: new Date() })
			.where(eq(telemedicineAppointments.id, input.appointmentId))

		this.logger.log(
			`Created telemedicine encounter: ${created.id} for appointment: ${input.appointmentId}`
		)
		return this.getEncounter({ id: created.id })
	}

	// =========================================================================
	// Get Prescription
	// =========================================================================

	async getPrescription(input: GetPrescriptionInput) {
		const signedByStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("signed_by_staff")

		const [row] = await db
			.select({
				id: telemedicinePrescriptions.id,
				encounterId: telemedicinePrescriptions.encounterId,
				appointmentId: telemedicinePrescriptions.appointmentId,
				prescriptionDate: telemedicinePrescriptions.prescriptionDate,
				validUntil: telemedicinePrescriptions.validUntil,
				status: telemedicinePrescriptions.status,
				prcLicenseNumber: telemedicinePrescriptions.prcLicenseNumber,
				ptrNumber: telemedicinePrescriptions.ptrNumber,
				dispensingInstructions: telemedicinePrescriptions.dispensingInstructions,
				signedAt: telemedicinePrescriptions.signedAt,
				sentAt: telemedicinePrescriptions.sentAt,
				sentToEmail: telemedicinePrescriptions.sentToEmail,
				createdAt: telemedicinePrescriptions.createdAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				patientSex: patients.sex,
				clinicianName: users.name,
				currentPrcNumber: staffProfiles.prcLicenseNumber,
				currentPtrNumber: staffProfiles.ptrNumber,
				facilityName: facilities.name,
				facilityAddress: facilities.address,
				signedByName: signedByStaff.name,
			})
			.from(telemedicinePrescriptions)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicinePrescriptions.encounterId, telemedicineEncounters.id)
			)
			.innerJoin(patients, eq(telemedicineEncounters.patientId, patients.id))
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicinePrescriptions.appointmentId, telemedicineAppointments.id)
			)
			.innerJoin(staffProfiles, eq(telemedicineEncounters.clinicianStaffId, staffProfiles.id))
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.innerJoin(facilities, eq(telemedicineAppointments.facilityId, facilities.id))
			.leftJoin(signedByStaff, eq(telemedicinePrescriptions.signedByStaffId, signedByStaff.id))
			.where(eq(telemedicinePrescriptions.id, input.id))

		if (!row) {
			throw new NotFoundException(`Prescription ${input.id} not found`)
		}

		const items = await db
			.select()
			.from(telemedicinePrescriptionItems)
			.where(eq(telemedicinePrescriptionItems.prescriptionId, input.id))
			.orderBy(telemedicinePrescriptionItems.sortOrder)

		const patientAge = this.calculateAge(row.patientDateOfBirth)

		return {
			id: row.id,
			encounterId: row.encounterId,
			appointmentId: row.appointmentId,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			patientMrn: row.patientMrn,
			patientAge,
			patientSex: row.patientSex,
			clinicianName: row.clinicianName,
			clinicianPrcNumber: row.prcLicenseNumber ?? row.currentPrcNumber ?? "",
			clinicianPtrNumber: row.ptrNumber ?? row.currentPtrNumber ?? "",
			clinicianSignature: row.signedAt ? (row.signedByName ?? row.clinicianName) : null,
			facilityName: row.facilityName,
			facilityAddress: row.facilityAddress ?? "",
			prescriptionDate: row.prescriptionDate,
			validUntil: row.validUntil,
			status: row.status,
			medications: items.map(item => ({
				id: item.id,
				genericName: item.genericName,
				brandName: item.brandName ?? null,
				dosage: item.dosage,
				form: item.form,
				quantity: item.quantity,
				unit: item.unit,
				frequency: item.frequency,
				duration: item.duration,
				route: item.route,
				instructions: item.instructions ?? null,
			})),
			dispensingInstructions: row.dispensingInstructions ?? null,
			signedAt: row.signedAt?.toISOString() ?? null,
			signedByName: row.signedByName ?? null,
			sentAt: row.sentAt?.toISOString() ?? null,
			sentToEmail: row.sentToEmail ?? null,
			createdAt: row.createdAt.toISOString(),
		}
	}

	// =========================================================================
	// List Prescriptions by Encounter
	// =========================================================================

	async listPrescriptions(input: ListPrescriptionsInput) {
		const rows = await db
			.select({ id: telemedicinePrescriptions.id })
			.from(telemedicinePrescriptions)
			.where(eq(telemedicinePrescriptions.encounterId, input.encounterId))
			.orderBy(desc(telemedicinePrescriptions.createdAt))

		return Promise.all(rows.map(r => this.getPrescription({ id: r.id })))
	}

	// =========================================================================
	// Create Prescription
	// =========================================================================

	async createPrescription(input: CreatePrescriptionInput, createdByStaffId?: string) {
		// Resolve the encounter to get the appointment
		const [enc] = await db
			.select()
			.from(telemedicineEncounters)
			.where(eq(telemedicineEncounters.id, input.encounterId))

		if (!enc) {
			throw new NotFoundException(`Telemedicine encounter ${input.encounterId} not found`)
		}

		this.assertAssignedClinician(
			createdByStaffId,
			enc.clinicianStaffId,
			"create prescriptions for this encounter"
		)
		if (enc.status === "finalized") {
			throw new BadRequestException("Cannot create prescriptions for a finalized encounter.")
		}
		const staff = await this.getPrescribingStaff(createdByStaffId)

		const today = new Date()
		const validUntil = new Date(today)
		validUntil.setDate(validUntil.getDate() + 30)

		const prescriptionDate = today.toISOString().split("T")[0]!
		const validUntilDate = validUntil.toISOString().split("T")[0]!

		const hasInvalidMedication = input.medications.some(
			med =>
				!med.genericName.trim() ||
				!med.dosage.trim() ||
				!med.form.trim() ||
				!med.unit.trim() ||
				!med.frequency.trim() ||
				!med.duration.trim() ||
				!med.route.trim()
		)
		if (hasInvalidMedication) {
			throw new BadRequestException(
				"Each medication requires generic name, dosage, form, unit, frequency, duration, and route."
			)
		}

		const [created] = await db
			.insert(telemedicinePrescriptions)
			.values({
				encounterId: input.encounterId,
				appointmentId: enc.appointmentId,
				prescriptionDate,
				validUntil: validUntilDate,
				status: "draft",
				prcLicenseNumber: staff.prcLicenseNumber,
				ptrNumber: staff.ptrNumber,
				dispensingInstructions: input.dispensingInstructions ?? null,
				createdByStaffId: createdByStaffId ?? null,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create prescription")
		}

		// Insert medication items
		if (input.medications.length > 0) {
			await db.insert(telemedicinePrescriptionItems).values(
				input.medications.map((med, idx) => ({
					prescriptionId: created.id,
					genericName: med.genericName.trim(),
					brandName: med.brandName?.trim() || null,
					dosage: med.dosage.trim(),
					form: med.form.trim(),
					quantity: med.quantity,
					unit: med.unit.trim(),
					frequency: med.frequency.trim(),
					duration: med.duration.trim(),
					route: med.route.trim(),
					instructions: med.instructions?.trim() || null,
					sortOrder: idx,
				}))
			)
		}

		this.logger.log(`Created telemedicine prescription: ${created.id}`)
		return this.getPrescription({ id: created.id })
	}

	async signPrescription(input: SignPrescriptionInput, signedByStaffId?: string) {
		const [row] = await db
			.select({
				id: telemedicinePrescriptions.id,
				status: telemedicinePrescriptions.status,
				clinicianStaffId: telemedicineEncounters.clinicianStaffId,
			})
			.from(telemedicinePrescriptions)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicinePrescriptions.encounterId, telemedicineEncounters.id)
			)
			.where(eq(telemedicinePrescriptions.id, input.id))
			.limit(1)

		if (!row) {
			throw new NotFoundException(`Prescription ${input.id} not found`)
		}

		this.assertAssignedClinician(signedByStaffId, row.clinicianStaffId, "sign this prescription")

		if (row.status !== "draft" && row.status !== "active") {
			throw new BadRequestException(`Prescription is already ${row.status}.`)
		}

		const staff = await this.getPrescribingStaff(signedByStaffId)

		await db
			.update(telemedicinePrescriptions)
			.set({
				status: "signed",
				prcLicenseNumber: staff.prcLicenseNumber,
				ptrNumber: staff.ptrNumber,
				signedAt: new Date(),
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: new Date(),
			})
			.where(eq(telemedicinePrescriptions.id, input.id))

		this.logger.log(`Signed telemedicine prescription: ${input.id}`)
		return this.getPrescription({ id: input.id })
	}

	async generatePrescriptionPdf(id: string, requesterStaffId?: string): Promise<Uint8Array> {
		const rx = await this.getPrescription({ id })
		const [row] = await db
			.select({ clinicianStaffId: telemedicineEncounters.clinicianStaffId })
			.from(telemedicinePrescriptions)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicinePrescriptions.encounterId, telemedicineEncounters.id)
			)
			.where(eq(telemedicinePrescriptions.id, id))
			.limit(1)

		if (!row) {
			throw new NotFoundException(`Prescription ${id} not found`)
		}

		this.assertAssignedClinician(
			requesterStaffId,
			row.clinicianStaffId,
			"download this prescription"
		)
		if (rx.status === "draft" || !rx.signedAt) {
			throw new BadRequestException("Prescription must be signed before PDF generation.")
		}

		const pdf = await PDFDocument.create()
		const page = pdf.addPage([612, 792])
		const font = await pdf.embedFont(StandardFonts.Helvetica)
		const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
		const margin = 48
		let y = 744

		const drawText = (text: string, x: number, size = 10, useBold = false) => {
			page.drawText(text, {
				x,
				y,
				size,
				font: useBold ? bold : font,
				color: rgb(0.08, 0.08, 0.08),
			})
			y -= size + 8
		}

		drawText(rx.facilityName, margin, 16, true)
		if (rx.facilityAddress) drawText(rx.facilityAddress, margin, 9)
		y -= 8
		drawText("E-PRESCRIPTION", margin, 14, true)
		y -= 4
		drawText(`Patient: ${rx.patientName}`, margin, 10, true)
		drawText(`MRN: ${rx.patientMrn}    Age/Sex: ${rx.patientAge} / ${rx.patientSex}`, margin)
		drawText(`Prescription Date: ${rx.prescriptionDate}    Valid Until: ${rx.validUntil}`, margin)
		y -= 8
		drawText("Medications", margin, 12, true)

		rx.medications.forEach((med, index) => {
			const brand = med.brandName ? ` (${med.brandName})` : ""
			drawText(`${index + 1}. ${med.genericName}${brand} ${med.dosage}`, margin, 10, true)
			drawText(
				`   ${med.quantity} ${med.unit} | ${med.form} | ${med.route} | ${med.frequency} | ${med.duration}`,
				margin
			)
			if (med.instructions) drawText(`   Instructions: ${med.instructions}`, margin)
			y -= 4
		})

		if (rx.dispensingInstructions) {
			y -= 4
			drawText("Dispensing Instructions", margin, 11, true)
			drawText(rx.dispensingInstructions, margin)
		}

		y = Math.max(y - 24, 120)
		drawText(rx.clinicianName, 360, 11, true)
		drawText(`PRC #${rx.clinicianPrcNumber}`, 360)
		drawText(`PTR #${rx.clinicianPtrNumber}`, 360)
		if (rx.signedAt) drawText(`Signed: ${new Date(rx.signedAt).toLocaleString("en-PH")}`, 360, 8)
		page.drawLine({
			start: { x: 360, y: y + 8 },
			end: { x: 540, y: y + 8 },
			thickness: 1,
			color: rgb(0.2, 0.2, 0.2),
		})
		drawText("Signature over Printed Name", 360, 8)

		return pdf.save()
	}

	async sendPrescription(input: SendPrescriptionInput, sentByStaffId?: string) {
		const [row] = await db
			.select({
				id: telemedicinePrescriptions.id,
				status: telemedicinePrescriptions.status,
				signedAt: telemedicinePrescriptions.signedAt,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineEncounters.clinicianStaffId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
			})
			.from(telemedicinePrescriptions)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicinePrescriptions.encounterId, telemedicineEncounters.id)
			)
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicinePrescriptions.appointmentId, telemedicineAppointments.id)
			)
			.innerJoin(patients, eq(telemedicineEncounters.patientId, patients.id))
			.where(eq(telemedicinePrescriptions.id, input.id))

		if (!row) {
			throw new NotFoundException(`Prescription ${input.id} not found`)
		}

		this.assertAssignedClinician(sentByStaffId, row.clinicianStaffId, "send this prescription")

		if (row.status === "draft" || !row.signedAt) {
			throw new BadRequestException("Prescription must be signed before sending.")
		}
		if (row.status === "cancelled") {
			throw new BadRequestException("Cancelled prescriptions cannot be sent.")
		}

		await db
			.update(telemedicinePrescriptions)
			.set({
				status: "sent",
				sentAt: new Date(),
				sentToEmail: input.email,
				updatedAt: new Date(),
			})
			.where(eq(telemedicinePrescriptions.id, input.id))

		await this.notificationService.send({
			facilityId: row.facilityId,
			recipientStaffId: row.clinicianStaffId,
			topic: "system",
			title: "Prescription Sent",
			body: `E-prescription for ${row.patientLastName}, ${row.patientFirstName} marked sent to ${input.email}. Email delivery requires a mailer integration.`,
			data: {
				prescriptionId: input.id,
				email: input.email,
			},
		})

		this.logger.log(`Marked telemedicine prescription ${input.id} sent to ${input.email}`)
		return this.getPrescription({ id: input.id })
	}

	// =========================================================================
	// Get Abstract
	// =========================================================================

	async getAbstract(input: GetAbstractInput) {
		const clinicianStaff = db
			.select({
				id: staffProfiles.id,
				name: users.name,
				prcLicenseNumber: staffProfiles.prcLicenseNumber,
			})
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const signedByStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("signed_by_staff")

		const [row] = await db
			.select({
				id: telemedicineAbstracts.id,
				encounterId: telemedicineAbstracts.encounterId,
				appointmentId: telemedicineAbstracts.appointmentId,
				chiefComplaint: telemedicineAbstracts.chiefComplaint,
				subjectiveNotes: telemedicineAbstracts.subjectiveNotes,
				objectiveNotes: telemedicineAbstracts.objectiveNotes,
				assessmentNotes: telemedicineAbstracts.assessmentNotes,
				planNotes: telemedicineAbstracts.planNotes,
				diagnosis: telemedicineAbstracts.diagnosis,
				icdCode: telemedicineAbstracts.icdCode,
				additionalNotes: telemedicineAbstracts.additionalNotes,
				status: telemedicineAbstracts.status,
				signedAt: telemedicineAbstracts.signedAt,
				sentAt: telemedicineAbstracts.sentAt,
				sentToEmail: telemedicineAbstracts.sentToEmail,
				createdAt: telemedicineAbstracts.createdAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				clinicianName: clinicianStaff.name,
				clinicianPrcNumber: clinicianStaff.prcLicenseNumber,
				facilityName: facilities.name,
				signedByName: signedByStaff.name,
			})
			.from(telemedicineAbstracts)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicineAbstracts.encounterId, telemedicineEncounters.id)
			)
			.innerJoin(patients, eq(telemedicineAbstracts.patientId, patients.id))
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicineAbstracts.appointmentId, telemedicineAppointments.id)
			)
			.innerJoin(clinicianStaff, eq(telemedicineEncounters.clinicianStaffId, clinicianStaff.id))
			.innerJoin(facilities, eq(telemedicineAppointments.facilityId, facilities.id))
			.leftJoin(signedByStaff, eq(telemedicineAbstracts.signedByStaffId, signedByStaff.id))
			.where(eq(telemedicineAbstracts.id, input.id))

		if (!row) {
			throw new NotFoundException(`Tele-abstract ${input.id} not found`)
		}

		return {
			id: row.id,
			encounterId: row.encounterId,
			appointmentId: row.appointmentId,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			clinicianName: row.clinicianName ?? "",
			clinicianPrcNumber: row.clinicianPrcNumber ?? "",
			facilityName: row.facilityName,
			chiefComplaint: row.chiefComplaint,
			subjectiveNotes: row.subjectiveNotes,
			objectiveNotes: row.objectiveNotes,
			assessmentNotes: row.assessmentNotes,
			planNotes: row.planNotes,
			diagnosis: row.diagnosis,
			icdCode: row.icdCode ?? null,
			additionalNotes: row.additionalNotes ?? null,
			status: row.status,
			signedAt: row.signedAt?.toISOString() ?? null,
			signedByName: row.signedByName ?? null,
			sentAt: row.sentAt?.toISOString() ?? null,
			sentToEmail: row.sentToEmail ?? null,
			createdAt: row.createdAt.toISOString(),
		}
	}

	// =========================================================================
	// List Abstracts by Encounter
	// =========================================================================

	async listEncounterAbstracts(input: ListEncounterAbstractsInput) {
		const rows = await db
			.select({ id: telemedicineAbstracts.id })
			.from(telemedicineAbstracts)
			.where(eq(telemedicineAbstracts.encounterId, input.encounterId))
			.orderBy(desc(telemedicineAbstracts.createdAt))

		return Promise.all(rows.map(r => this.getAbstract({ id: r.id })))
	}

	// =========================================================================
	// Generate Abstract
	// =========================================================================

	async generateAbstract(input: GenerateAbstractInput, createdByStaffId?: string) {
		// Fetch encounter data to populate the abstract
		const [enc] = await db
			.select()
			.from(telemedicineEncounters)
			.where(eq(telemedicineEncounters.id, input.encounterId))

		if (!enc) {
			throw new NotFoundException(`Telemedicine encounter ${input.encounterId} not found`)
		}

		this.assertAssignedClinician(
			createdByStaffId,
			enc.clinicianStaffId,
			"generate an abstract for this encounter"
		)

		// Return existing abstract only after assignment has been verified.
		const [existing] = await db
			.select({ id: telemedicineAbstracts.id })
			.from(telemedicineAbstracts)
			.where(eq(telemedicineAbstracts.encounterId, input.encounterId))

		if (existing) {
			return this.getAbstract({ id: existing.id })
		}

		const [created] = await db
			.insert(telemedicineAbstracts)
			.values({
				encounterId: input.encounterId,
				appointmentId: enc.appointmentId,
				patientId: enc.patientId,
				chiefComplaint: enc.chiefComplaint,
				subjectiveNotes: enc.subjectiveNotes,
				objectiveNotes: enc.objectiveNotes,
				assessmentNotes: enc.assessmentNotes,
				planNotes: enc.planNotes,
				diagnosis: enc.diagnosis,
				icdCode: enc.icdCode ?? null,
				additionalNotes: input.additionalNotes ?? null,
				status: "draft",
				createdByStaffId: createdByStaffId ?? null,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to generate abstract")
		}

		this.logger.log(`Generated tele-abstract: ${created.id} for encounter: ${input.encounterId}`)
		return this.getAbstract({ id: created.id })
	}

	// =========================================================================
	// Sign Abstract
	// =========================================================================

	async signAbstract(input: SignAbstractInput, signedByStaffId?: string) {
		const [abstract] = await db
			.select()
			.from(telemedicineAbstracts)
			.where(eq(telemedicineAbstracts.id, input.id))

		if (!abstract) {
			throw new NotFoundException(`Tele-abstract ${input.id} not found`)
		}

		const [enc] = await db
			.select({ clinicianStaffId: telemedicineEncounters.clinicianStaffId })
			.from(telemedicineEncounters)
			.where(eq(telemedicineEncounters.id, abstract.encounterId))
			.limit(1)

		if (!enc) {
			throw new NotFoundException(`Telemedicine encounter ${abstract.encounterId} not found`)
		}

		this.assertAssignedClinician(signedByStaffId, enc.clinicianStaffId, "sign this abstract")

		if (abstract.status !== "draft") {
			throw new BadRequestException(`Abstract is already ${abstract.status}`)
		}

		await this.getClinicalSigningStaff(signedByStaffId)

		await db
			.update(telemedicineAbstracts)
			.set({
				status: "signed",
				signedAt: new Date(),
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: new Date(),
			})
			.where(eq(telemedicineAbstracts.id, input.id))

		// Mark encounter as signed
		await db
			.update(telemedicineEncounters)
			.set({
				status: "signed",
				signedAt: new Date(),
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: new Date(),
			})
			.where(eq(telemedicineEncounters.id, abstract.encounterId))

		this.logger.log(`Signed tele-abstract: ${input.id}`)
		return this.getAbstract({ id: input.id })
	}

	// =========================================================================
	// Send Abstract
	// =========================================================================

	async sendAbstract(input: SendAbstractInput, sentByStaffId?: string) {
		const [abstract] = await db
			.select()
			.from(telemedicineAbstracts)
			.where(eq(telemedicineAbstracts.id, input.id))

		if (!abstract) {
			throw new NotFoundException(`Tele-abstract ${input.id} not found`)
		}

		const [enc] = await db
			.select({ clinicianStaffId: telemedicineEncounters.clinicianStaffId })
			.from(telemedicineEncounters)
			.where(eq(telemedicineEncounters.id, abstract.encounterId))
			.limit(1)

		if (!enc) {
			throw new NotFoundException(`Telemedicine encounter ${abstract.encounterId} not found`)
		}

		this.assertAssignedClinician(sentByStaffId, enc.clinicianStaffId, "send this abstract")

		if (abstract.status === "draft") {
			throw new BadRequestException("Abstract must be signed before sending")
		}

		await db
			.update(telemedicineAbstracts)
			.set({
				status: "sent",
				sentAt: new Date(),
				sentToEmail: input.email,
				updatedAt: new Date(),
			})
			.where(eq(telemedicineAbstracts.id, input.id))

		// Mark encounter as finalized after abstract is sent
		await db
			.update(telemedicineEncounters)
			.set({ status: "finalized", updatedAt: new Date() })
			.where(eq(telemedicineEncounters.id, abstract.encounterId))

		await db
			.update(telemedicineAppointments)
			.set({ status: "completed", updatedAt: new Date() })
			.where(eq(telemedicineAppointments.id, abstract.appointmentId))

		const [notificationTarget] = await db
			.select({
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineEncounters.clinicianStaffId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
			})
			.from(telemedicineAbstracts)
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicineAbstracts.appointmentId, telemedicineAppointments.id)
			)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicineAbstracts.encounterId, telemedicineEncounters.id)
			)
			.innerJoin(patients, eq(telemedicineAbstracts.patientId, patients.id))
			.where(eq(telemedicineAbstracts.id, input.id))

		if (notificationTarget) {
			await this.notificationService.send({
				facilityId: notificationTarget.facilityId,
				recipientStaffId: notificationTarget.clinicianStaffId,
				topic: "system",
				title: "Abstract Sent",
				body: `Tele-abstract for ${notificationTarget.patientLastName}, ${notificationTarget.patientFirstName} marked sent to ${input.email}. Email delivery requires a mailer integration.`,
				data: {
					abstractId: input.id,
					email: input.email,
					sentByStaffId: sentByStaffId ?? null,
				},
			})
		}

		this.logger.log(`Marked tele-abstract ${input.id} sent to ${input.email}`)
		return this.getAbstract({ id: input.id })
	}

	// =========================================================================
	// Private utilities
	// =========================================================================

	private calculateAge(dateOfBirth: string): number {
		const dob = new Date(dateOfBirth)
		const today = new Date()
		let age = today.getFullYear() - dob.getFullYear()
		const monthDiff = today.getMonth() - dob.getMonth()
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--
		}
		return age
	}
}
