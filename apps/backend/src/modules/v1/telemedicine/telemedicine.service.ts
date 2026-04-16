import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import {
	encounters,
	facilities,
	patients,
	staffProfiles,
	telemedicineAppointments,
	telemedicineEncounters,
	telemedicinePrescriptionItems,
	telemedicinePrescriptions,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type ListAppointmentsInput = V1Inputs["telemedicine"]["listAppointments"]
type GetAppointmentInput = V1Inputs["telemedicine"]["getAppointment"]
type CreateAppointmentInput = V1Inputs["telemedicine"]["createAppointment"]
type CancelAppointmentInput = V1Inputs["telemedicine"]["cancelAppointment"]
type GetEncounterInput = V1Inputs["telemedicine"]["getEncounter"]
type CreateEncounterInput = V1Inputs["telemedicine"]["createEncounter"]
type GetPrescriptionInput = V1Inputs["telemedicine"]["getPrescription"]
type ListPrescriptionsInput = V1Inputs["telemedicine"]["listPrescriptions"]
type CreatePrescriptionInput = V1Inputs["telemedicine"]["createPrescription"]

@Injectable()
export class TelemedicineService {
	private readonly logger = new Logger(TelemedicineService.name)

	// =========================================================================
	// Private helpers
	// =========================================================================

	private buildAppointmentRow(
		appt: typeof telemedicineAppointments.$inferSelect,
		patientRow: { firstName: string; lastName: string; mrn: string; phone: string | null; email: string | null },
		clinicianName: string,
		clinicianSpecialty: string,
		createdByName: string,
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
					encounterId: telemedicineAppointments.encounterId,
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
				.innerJoin(patients, eq(telemedicineAppointments.patientId, patients.id))
				.leftJoin(clinicianStaff, eq(telemedicineAppointments.clinicianStaffId, clinicianStaff.id))
				.leftJoin(createdByStaff, eq(telemedicineAppointments.createdByStaffId, createdByStaff.id))
				.where(whereClause)
				.orderBy(desc(telemedicineAppointments.scheduledDate), desc(telemedicineAppointments.scheduledTime))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(telemedicineAppointments)
				.where(whereClause),
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
			encounterId: r.encounterId ?? null,
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
				encounterId: telemedicineAppointments.encounterId,
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
			encounterId: row.encounterId ?? null,
			createdAt: row.createdAt.toISOString(),
			createdByName: row.createdByName ?? "",
		}
	}

	// =========================================================================
	// Create Appointment
	// =========================================================================

	async createAppointment(input: CreateAppointmentInput, createdByStaffId?: string) {
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

		const staffId = createdByStaffId ?? appt.clinicianStaffId

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

		this.logger.log(`Created telemedicine encounter: ${created.id} for appointment: ${input.appointmentId}`)
		void staffId
		return this.getEncounter({ id: created.id })
	}

	// =========================================================================
	// Get Prescription
	// =========================================================================

	async getPrescription(input: GetPrescriptionInput) {
		const [row] = await db
			.select({
				id: telemedicinePrescriptions.id,
				encounterId: telemedicinePrescriptions.encounterId,
				appointmentId: telemedicinePrescriptions.appointmentId,
				prescriptionDate: telemedicinePrescriptions.prescriptionDate,
				validUntil: telemedicinePrescriptions.validUntil,
				status: telemedicinePrescriptions.status,
				dispensingInstructions: telemedicinePrescriptions.dispensingInstructions,
				createdAt: telemedicinePrescriptions.createdAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				patientSex: patients.sex,
				clinicianName: users.name,
				clinicianPrcNumber: staffProfiles.prcLicenseNumber,
				facilityName: facilities.name,
				facilityAddress: facilities.address,
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
			.innerJoin(
				staffProfiles,
				eq(telemedicineEncounters.clinicianStaffId, staffProfiles.id)
			)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.innerJoin(facilities, eq(telemedicineAppointments.facilityId, facilities.id))
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
			clinicianPrcNumber: row.clinicianPrcNumber ?? "",
			clinicianSignature: null,
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

		const today = new Date()
		const validUntil = new Date(today)
		validUntil.setDate(validUntil.getDate() + 30)

		const prescriptionDate = today.toISOString().split("T")[0]!
		const validUntilDate = validUntil.toISOString().split("T")[0]!

		const [created] = await db
			.insert(telemedicinePrescriptions)
			.values({
				encounterId: input.encounterId,
				appointmentId: enc.appointmentId,
				prescriptionDate,
				validUntil: validUntilDate,
				status: "active",
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
					genericName: med.genericName,
					brandName: med.brandName ?? null,
					dosage: med.dosage,
					form: med.form,
					quantity: med.quantity,
					unit: med.unit,
					frequency: med.frequency,
					duration: med.duration,
					route: med.route,
					instructions: med.instructions ?? null,
					sortOrder: idx,
				}))
			)
		}

		this.logger.log(`Created telemedicine prescription: ${created.id}`)
		return this.getPrescription({ id: created.id })
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
