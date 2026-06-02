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
	roles,
	staffProfiles,
	telemedicineAbstracts,
	telemedicineAppointments,
	telemedicineEncounters,
	telemedicinePrescriptionItems,
	telemedicinePrescriptions,
	userRoles,
	users,
} from "@repo/db/schema"

import { CommonAuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { LiveKitService } from "@/common/livekit/livekit.service"
import { MailerService } from "@/common/mail/mailer.service"
import type { V1Inputs } from "@/config/contract-types"
import { env } from "@/config/env.config"
import { NotificationService } from "@/modules/v1/notifications/notification.service"

import {
	generatePatientInviteToken,
	getPatientInviteExpiresAt,
	getTelemedicineJoinWindow,
	hashPatientInviteToken,
	isTelemedicineStatusJoinable,
	isWithinTelemedicineJoinWindow,
	parseTelemedicineAppointmentDateTime,
} from "./telemedicine-invites"
import { assertTelemedicineVideoLink } from "./telemedicine-video-link"

type ListAppointmentsInput = V1Inputs["telemedicine"]["listAppointments"]
type GetAppointmentInput = V1Inputs["telemedicine"]["getAppointment"]
type CreateAppointmentInput = V1Inputs["telemedicine"]["createAppointment"]
type UpdateAppointmentInput = V1Inputs["telemedicine"]["updateAppointment"]
type CancelAppointmentInput = V1Inputs["telemedicine"]["cancelAppointment"]
type JoinPatientLiveKitRoomInput = V1Inputs["telemedicine"]["joinPatientLiveKitRoom"]
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
type StaffRole = { id: string; name: string }
type AuditRoleContext = {
	userRoles: string[]
	isSchedulerAction: boolean
	isPhysicianAction: boolean
}

@Injectable()
export class TelemedicineService {
	private readonly logger = new Logger(TelemedicineService.name)
	private static readonly PHYSICIAN_ROLE_NAMES = new Set([
		"Physician",
		"Surgeon",
		"Anesthesiologist",
	])

	constructor(
		private readonly notificationService: NotificationService,
		private readonly liveKitService: LiveKitService,
		private readonly auditService: CommonAuditService,
		private readonly mailerService: MailerService
	) {}

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
			livekitRoomName: appt.livekitRoomName ?? null,
			livekitSessionStartedAt: this.serializeDate(appt.livekitSessionStartedAt),
			livekitSessionEndedAt: this.serializeDate(appt.livekitSessionEndedAt),
			patientInviteExpiresAt: this.serializeDate(appt.patientInviteExpiresAt),
			patientInviteRevokedAt: this.serializeDate(appt.patientInviteRevokedAt),
			patientInviteLastUsedAt: this.serializeDate(appt.patientInviteLastUsedAt),
			patientJoinedAt: this.serializeDate(appt.patientJoinedAt),
			notes: appt.notes ?? null,
			encounterId: appt.linkedCoreEncounterId ?? null,
			linkedCoreEncounterId: appt.linkedCoreEncounterId ?? null,
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
		const scheduledAt = parseTelemedicineAppointmentDateTime(scheduledDate, scheduledTime)
		if (!Number.isFinite(scheduledAt.getTime())) {
			throw new BadRequestException("Appointment date and time are invalid.")
		}
		if (scheduledAt.getTime() <= Date.now()) {
			throw new BadRequestException("Appointment date and time must be in the future.")
		}
	}

	private serializeDate(value?: Date | null) {
		return value ? value.toISOString() : null
	}

	private buildPatientInvite(appointment: {
		scheduledDate: string
		scheduledTime: string
		durationMinutes: number
	}) {
		const patientInviteToken = generatePatientInviteToken()
		return {
			patientInviteToken,
			patientInviteTokenHash: hashPatientInviteToken(patientInviteToken),
			patientInviteExpiresAt: getPatientInviteExpiresAt(appointment),
		}
	}

	private buildInviteStatus(appointment: {
		id: string
		patientInviteTokenHash?: string | null
		patientInviteExpiresAt?: Date | null
		patientInviteRevokedAt?: Date | null
	}) {
		return {
			appointmentId: appointment.id,
			hasPatientInvite: Boolean(
				appointment.patientInviteTokenHash && !appointment.patientInviteRevokedAt
			),
			patientInviteExpiresAt: this.serializeDate(appointment.patientInviteExpiresAt),
			patientInviteRevokedAt: this.serializeDate(appointment.patientInviteRevokedAt),
		}
	}

	private hasPhysicianRole(staffRoles: StaffRole[]) {
		return staffRoles.some(role => TelemedicineService.PHYSICIAN_ROLE_NAMES.has(role.name))
	}

	private async getUserRoles(userId: string): Promise<StaffRole[]> {
		const rows = await db
			.select({
				roleId: userRoles.roleId,
				roleName: roles.name,
			})
			.from(staffProfiles)
			.innerJoin(userRoles, eq(userRoles.staffProfileId, staffProfiles.id))
			.innerJoin(roles, eq(roles.id, userRoles.roleId))
			.where(eq(staffProfiles.userId, userId))

		return rows.map(row => ({ id: row.roleId, name: row.roleName }))
	}

	private async getStaffProfileWithUser(staffProfileId: string) {
		const [profile] = await db
			.select({
				id: staffProfiles.id,
				userId: staffProfiles.userId,
				facilityId: staffProfiles.facilityId,
				isActive: staffProfiles.isActive,
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))
			.limit(1)

		if (!profile) {
			throw new NotFoundException(`Staff profile ${staffProfileId} not found`)
		}

		return profile
	}

	private async assertSchedulerCanCreateAppointment(
		input: CreateAppointmentInput,
		createdByStaffId: string | undefined
	) {
		if (!createdByStaffId) {
			return
		}

		const creatorProfile = await this.getStaffProfileWithUser(createdByStaffId)
		const creatorRoles = await this.getUserRoles(creatorProfile.userId)
		const isScheduler = creatorRoles.some(role => role.name === "Scheduler")

		if (!isScheduler || this.hasPhysicianRole(creatorRoles)) {
			return
		}

		if (!input.clinicianId) {
			throw new BadRequestException(
				"Schedulers must assign a physician to telemedicine appointments. Please select a clinician from the dropdown."
			)
		}

		if (input.clinicianId === createdByStaffId) {
			throw new BadRequestException(
				"Schedulers cannot assign themselves as the treating physician. Please select a different clinician."
			)
		}

		const clinicianProfile = await this.getStaffProfileWithUser(input.clinicianId)
		const clinicianRoles = await this.getUserRoles(clinicianProfile.userId)

		if (!this.hasPhysicianRole(clinicianRoles)) {
			throw new BadRequestException(
				"The assigned clinician must have a Physician, Surgeon, or Anesthesiologist role."
			)
		}
	}

	private assertAppointmentStatusJoinable(status: string) {
		if (!isTelemedicineStatusJoinable(status)) {
			throw new BadRequestException(`Video room is unavailable for ${status} appointments.`)
		}
	}

	private shouldStartLiveKitSession(status: string) {
		return status === "scheduled" || status === "confirmed"
	}

	private assertLiveKitSessionCanEnd(status: string) {
		if (status !== "in-progress") {
			throw new BadRequestException(
				`Video session can only be ended for in-progress appointments, not ${status} appointments.`
			)
		}
	}

	private formatJoinWindowDateTime(value: Date) {
		return new Intl.DateTimeFormat("en-PH", {
			timeZone: "Asia/Manila",
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		}).format(value)
	}

	private assertAppointmentWithinJoinWindow(appointment: {
		scheduledDate: string
		scheduledTime: string
		durationMinutes: number
	}) {
		const joinWindow = getTelemedicineJoinWindow(appointment)
		if (!isWithinTelemedicineJoinWindow(joinWindow)) {
			throw new BadRequestException(
				`Video room can be joined from ${this.formatJoinWindowDateTime(joinWindow.startsAt)} until ${this.formatJoinWindowDateTime(joinWindow.endsAt)}.`
			)
		}

		return joinWindow
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
			throw new BadRequestException(
				"Cannot book a telemedicine appointment for an inactive patient."
			)
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
			throw new BadRequestException(
				"Cannot book a telemedicine appointment with an inactive clinician."
			)
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
	// Audit helpers
	// =========================================================================

	private static readonly ANONYMOUS_USER_ID = "telemedicine:anonymous"

	private buildAuditRoleContext(staffRoles: StaffRole[]) {
		return {
			userRoles: staffRoles.map(role => role.name),
			isSchedulerAction: staffRoles.some(role => role.name === "Scheduler"),
			isPhysicianAction: this.hasPhysicianRole(staffRoles),
		}
	}

	private async writeTelemedicineAudit(input: {
		facilityId: string
		staffProfileId: string | null
		userId?: string | null
		action: "create" | "read" | "update" | "delete" | "sign" | "verify" | "override"
		entityType: string
		entityId: string
		beforeState?: Record<string, unknown> | null
		afterState?: Record<string, unknown> | null
		metadata?: Record<string, unknown> | null
		severity?: "info" | "warning" | "critical"
		outcome?: "success" | "failure"
	}): Promise<void> {
		try {
			let userId = input.userId ?? TelemedicineService.ANONYMOUS_USER_ID
			let roleContext: AuditRoleContext | null = null

			if (input.staffProfileId) {
				const profile = await this.getStaffProfileWithUser(input.staffProfileId)
				const staffRoles = await this.getUserRoles(profile.userId)
				userId = input.userId ?? profile.userId
				roleContext = this.buildAuditRoleContext(staffRoles)
			}

			await this.auditService.log({
				facilityId: input.facilityId,
				userId,
				staffProfileId: input.staffProfileId,
				action: input.action,
				entityType: input.entityType,
				entityId: input.entityId,
				beforeState: input.beforeState ?? null,
				afterState: input.afterState ?? null,
				ipAddress: null,
				userAgent: null,
				metadata: roleContext
					? { ...(input.metadata ?? {}), ...roleContext }
					: (input.metadata ?? null),
				severity: input.severity ?? "info",
				outcome: input.outcome ?? "success",
			})
		} catch (error) {
			this.logger.error(
				`Failed to write telemedicine audit (${input.entityType}/${input.action}/${input.entityId}): ${error}`
			)
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
					livekitRoomName: telemedicineAppointments.livekitRoomName,
					livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
					livekitSessionEndedAt: telemedicineAppointments.livekitSessionEndedAt,
					patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
					patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
					patientInviteLastUsedAt: telemedicineAppointments.patientInviteLastUsedAt,
					patientJoinedAt: telemedicineAppointments.patientJoinedAt,
					notes: telemedicineAppointments.notes,
					linkedCoreEncounterId: telemedicineAppointments.linkedCoreEncounterId,
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
			livekitRoomName: r.livekitRoomName ?? null,
			livekitSessionStartedAt: this.serializeDate(r.livekitSessionStartedAt),
			livekitSessionEndedAt: this.serializeDate(r.livekitSessionEndedAt),
			patientInviteExpiresAt: this.serializeDate(r.patientInviteExpiresAt),
			patientInviteRevokedAt: this.serializeDate(r.patientInviteRevokedAt),
			patientInviteLastUsedAt: this.serializeDate(r.patientInviteLastUsedAt),
			patientJoinedAt: this.serializeDate(r.patientJoinedAt),
			notes: r.notes ?? null,
			encounterId: r.teleEncounterId ?? null,
			linkedCoreEncounterId: r.linkedCoreEncounterId ?? null,
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
				livekitRoomName: telemedicineAppointments.livekitRoomName,
				livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
				livekitSessionEndedAt: telemedicineAppointments.livekitSessionEndedAt,
				patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
				patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
				patientInviteLastUsedAt: telemedicineAppointments.patientInviteLastUsedAt,
				patientJoinedAt: telemedicineAppointments.patientJoinedAt,
				notes: telemedicineAppointments.notes,
				linkedCoreEncounterId: telemedicineAppointments.linkedCoreEncounterId,
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
			livekitRoomName: row.livekitRoomName ?? null,
			livekitSessionStartedAt: this.serializeDate(row.livekitSessionStartedAt),
			livekitSessionEndedAt: this.serializeDate(row.livekitSessionEndedAt),
			patientInviteExpiresAt: this.serializeDate(row.patientInviteExpiresAt),
			patientInviteRevokedAt: this.serializeDate(row.patientInviteRevokedAt),
			patientInviteLastUsedAt: this.serializeDate(row.patientInviteLastUsedAt),
			patientJoinedAt: this.serializeDate(row.patientJoinedAt),
			notes: row.notes ?? null,
			encounterId: row.teleEncounterId ?? null,
			linkedCoreEncounterId: row.linkedCoreEncounterId ?? null,
			createdAt: row.createdAt.toISOString(),
			createdByName: row.createdByName ?? "",
		}
	}

	// =========================================================================
	// Create Appointment
	// =========================================================================

	async createAppointment(input: CreateAppointmentInput, createdByStaffId?: string) {
		this.assertFutureAppointment(input.scheduledDate, input.scheduledTime)
		await this.assertSchedulerCanCreateAppointment(input, createdByStaffId)
		await this.assertAppointmentScope(input)
		const durationMinutes = input.durationMinutes ?? 30
		const appointmentTiming = {
			scheduledDate: input.scheduledDate,
			scheduledTime: input.scheduledTime,
			durationMinutes,
		}
		const patientInvite = this.buildPatientInvite(appointmentTiming)

		const [created] = await db
			.insert(telemedicineAppointments)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				clinicianStaffId: input.clinicianId,
				scheduledDate: input.scheduledDate,
				scheduledTime: input.scheduledTime,
				durationMinutes,
				platform: "livekit",
				patientInviteTokenHash: patientInvite.patientInviteTokenHash,
				patientInviteExpiresAt: patientInvite.patientInviteExpiresAt,
				notes: input.notes ?? null,
				createdByStaffId: createdByStaffId ?? null,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create telemedicine appointment")
		}

		const roomName = this.liveKitService.getRoomName(created.id)
		await db
			.update(telemedicineAppointments)
			.set({ livekitRoomName: roomName, updatedAt: new Date() })
			.where(eq(telemedicineAppointments.id, created.id))

		await this.writeTelemedicineAudit({
			facilityId: input.facilityId,
			staffProfileId: createdByStaffId ?? null,
			action: "create",
			entityType: "telemedicine_appointment",
			entityId: created.id,
			beforeState: null,
			afterState: {
				patientId: input.patientId,
				clinicianId: input.clinicianId,
				scheduledDate: input.scheduledDate,
				scheduledTime: input.scheduledTime,
				durationMinutes,
				platform: "livekit",
			},
			metadata: { roomName },
		})

		this.logger.log(`Created telemedicine appointment: ${created.id}`)
		return {
			...(await this.getAppointment({ id: created.id })),
			patientInviteToken: patientInvite.patientInviteToken,
		}
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

		await this.writeTelemedicineAudit({
			facilityId: appt.facilityId,
			staffProfileId: updatedByStaffId ?? null,
			action: "update",
			entityType: "telemedicine_appointment",
			entityId: input.id,
			beforeState: {
				videoLink: appt.videoLink ?? null,
				meetingId: appt.meetingId ?? null,
				meetingPassword: appt.meetingPassword ?? null,
			},
			afterState: {
				videoLink: updates.videoLink ?? appt.videoLink ?? null,
				meetingId: updates.meetingId ?? appt.meetingId ?? null,
				meetingPassword: updates.meetingPassword ?? appt.meetingPassword ?? null,
			},
		})

		this.logger.log(`Updated telemedicine appointment: ${input.id}`)
		return this.getAppointment({ id: input.id })
	}

	// =========================================================================
	// Cancel Appointment
	// =========================================================================

	async cancelAppointment(input: CancelAppointmentInput, cancelledByStaffId?: string) {
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

		await this.writeTelemedicineAudit({
			facilityId: appt.facilityId,
			staffProfileId: cancelledByStaffId ?? null,
			action: "update",
			entityType: "telemedicine_appointment",
			entityId: input.id,
			beforeState: { status: appt.status },
			afterState: { status: "cancelled" },
			metadata: { cancellationReason: input.cancellationReason ?? null },
			severity: "warning",
		})

		this.logger.log(`Cancelled telemedicine appointment: ${input.id}`)
	}

	async joinClinicianLiveKitRoom(appointmentId: string, staffProfileId: string) {
		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				scheduledDate: telemedicineAppointments.scheduledDate,
				scheduledTime: telemedicineAppointments.scheduledTime,
				durationMinutes: telemedicineAppointments.durationMinutes,
				status: telemedicineAppointments.status,
				livekitRoomName: telemedicineAppointments.livekitRoomName,
				livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
				clinicianName: clinicianStaff.name,
			})
			.from(telemedicineAppointments)
			.leftJoin(clinicianStaff, eq(telemedicineAppointments.clinicianStaffId, clinicianStaff.id))
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)

		if (!appointment) {
			throw new NotFoundException(`Telemedicine appointment ${appointmentId} not found`)
		}

		this.assertAssignedClinician(
			staffProfileId,
			appointment.clinicianStaffId,
			"join this video room"
		)
		this.assertAppointmentStatusJoinable(appointment.status)
		this.assertAppointmentWithinJoinWindow(appointment)

		if (!this.liveKitService.isConfigured()) {
			return { isConfigured: false }
		}

		const roomName = appointment.livekitRoomName ?? this.liveKitService.getRoomName(appointmentId)
		const token = await this.liveKitService.generateToken({
			roomName,
			identity: `clinician:${staffProfileId}`,
			name: appointment.clinicianName ?? "Clinician",
			role: "clinician",
			appointmentId,
			ttl: "2h",
		})

		const shouldStartSession = this.shouldStartLiveKitSession(appointment.status)
		if (
			!appointment.livekitRoomName ||
			!appointment.livekitSessionStartedAt ||
			shouldStartSession
		) {
			const now = new Date()
			const updates: Partial<typeof telemedicineAppointments.$inferInsert> = {
				updatedAt: now,
			}

			if (!appointment.livekitRoomName) {
				updates.livekitRoomName = roomName
			}
			if (!appointment.livekitSessionStartedAt) {
				updates.livekitSessionStartedAt = now
			}
			if (shouldStartSession) {
				updates.status = "in-progress"
			}

			await db
				.update(telemedicineAppointments)
				.set(updates)
				.where(eq(telemedicineAppointments.id, appointmentId))
		}

		await this.writeTelemedicineAudit({
			facilityId: appointment.facilityId,
			staffProfileId,
			action: "create",
			entityType: "telemedicine_livekit_token",
			entityId: appointmentId,
			afterState: { role: "clinician", roomName, identity: `clinician:${staffProfileId}` },
			metadata: { ttlSeconds: 7200 },
		})

		return {
			isConfigured: true,
			token,
			wsUrl: env.LIVEKIT_WS_URL,
			roomName,
		}
	}

	async endClinicianLiveKitSession(appointmentId: string, staffProfileId: string) {
		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				status: telemedicineAppointments.status,
				livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
				livekitSessionEndedAt: telemedicineAppointments.livekitSessionEndedAt,
			})
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)

		if (!appointment) {
			throw new NotFoundException(`Telemedicine appointment ${appointmentId} not found`)
		}

		this.assertAssignedClinician(
			staffProfileId,
			appointment.clinicianStaffId,
			"end this video session"
		)

		if (appointment.livekitSessionEndedAt) {
			return {
				appointmentId,
				livekitSessionEndedAt: appointment.livekitSessionEndedAt.toISOString(),
			}
		}

		this.assertLiveKitSessionCanEnd(appointment.status)

		if (!appointment.livekitSessionStartedAt) {
			throw new BadRequestException("Video session has not started yet.")
		}

		const endedAt = new Date()
		await db
			.update(telemedicineAppointments)
			.set({ livekitSessionEndedAt: endedAt, updatedAt: endedAt })
			.where(eq(telemedicineAppointments.id, appointmentId))

		await this.writeTelemedicineAudit({
			facilityId: appointment.facilityId,
			staffProfileId,
			action: "update",
			entityType: "telemedicine_appointment_session",
			entityId: appointmentId,
			beforeState: {
				livekitSessionStartedAt: appointment.livekitSessionStartedAt.toISOString(),
				livekitSessionEndedAt: null,
			},
			afterState: { livekitSessionEndedAt: endedAt.toISOString() },
			metadata: { trigger: "clinician_end" },
		})

		return {
			appointmentId,
			livekitSessionEndedAt: endedAt.toISOString(),
		}
	}

	private parseAppointmentIdFromRoomName(roomName: string | undefined | null): string | null {
		if (!roomName) return null
		const match = /^telemed-([0-9a-fA-F-]{36})$/.exec(roomName)
		return match?.[1] ?? null
	}

	private parseParticipantIdentity(identity: string | undefined | null): {
		role: "clinician" | "patient" | "unknown"
		actorId: string | null
	} {
		if (!identity) return { role: "unknown", actorId: null }
		const [prefix, ...rest] = identity.split(":")
		const actorId = rest.join(":") || null
		if (prefix === "clinician") return { role: "clinician", actorId }
		if (prefix === "patient") return { role: "patient", actorId }
		return { role: "unknown", actorId }
	}

	async handleLiveKitWebhook(body: string, authHeader: string | undefined): Promise<void> {
		let event: Awaited<ReturnType<LiveKitService["verifyWebhook"]>>
		try {
			event = await this.liveKitService.verifyWebhook(body, authHeader)
		} catch (error) {
			this.logger.warn(
				`Rejected LiveKit webhook: ${error instanceof Error ? error.message : error}`
			)
			throw new ForbiddenException("Invalid LiveKit webhook signature.")
		}

		const eventName = event.event
		const roomName = event.room?.name
		const appointmentId = this.parseAppointmentIdFromRoomName(roomName)
		if (!appointmentId) {
			this.logger.debug(`Ignoring LiveKit webhook ${eventName} for unrelated room ${roomName}`)
			return
		}

		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
				livekitSessionEndedAt: telemedicineAppointments.livekitSessionEndedAt,
				patientJoinedAt: telemedicineAppointments.patientJoinedAt,
			})
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)

		if (!appointment) {
			this.logger.warn(
				`LiveKit webhook ${eventName} references unknown appointment ${appointmentId}`
			)
			return
		}

		const [clinician] = await db
			.select({ userId: staffProfiles.userId })
			.from(staffProfiles)
			.where(eq(staffProfiles.id, appointment.clinicianStaffId))
			.limit(1)

		const actorUserId = clinician?.userId ?? TelemedicineService.ANONYMOUS_USER_ID
		const participantIdentity = event.participant?.identity ?? null
		const participantName = event.participant?.name ?? null
		const participantSid = event.participant?.sid ?? null
		const { role: participantRole } = this.parseParticipantIdentity(participantIdentity)
		const eventTimestamp =
			typeof event.createdAt === "bigint" && event.createdAt > 0n
				? new Date(Number(event.createdAt) * 1000)
				: new Date()
		const auditMetadata = {
			liveKitEvent: eventName,
			liveKitEventId: event.id || null,
			roomName: roomName ?? null,
			participantIdentity,
			participantName,
			participantSid,
			participantRole,
			occurredAt: eventTimestamp.toISOString(),
		}

		switch (eventName) {
			case "room_started": {
				if (!appointment.livekitSessionStartedAt) {
					await db
						.update(telemedicineAppointments)
						.set({ livekitSessionStartedAt: eventTimestamp, updatedAt: new Date() })
						.where(eq(telemedicineAppointments.id, appointmentId))
				}
				break
			}
			case "participant_joined": {
				const updates: Partial<typeof telemedicineAppointments.$inferInsert> = {
					updatedAt: new Date(),
				}
				if (!appointment.livekitSessionStartedAt) {
					updates.livekitSessionStartedAt = eventTimestamp
				}
				if (participantRole === "patient" && !appointment.patientJoinedAt) {
					updates.patientJoinedAt = eventTimestamp
				}
				if (Object.keys(updates).length > 1) {
					await db
						.update(telemedicineAppointments)
						.set(updates)
						.where(eq(telemedicineAppointments.id, appointmentId))
				}
				break
			}
			case "participant_left":
			case "participant_connection_aborted": {
				break
			}
			case "room_finished": {
				if (!appointment.livekitSessionEndedAt) {
					await db
						.update(telemedicineAppointments)
						.set({ livekitSessionEndedAt: eventTimestamp, updatedAt: new Date() })
						.where(eq(telemedicineAppointments.id, appointmentId))
				}
				break
			}
			default: {
				this.logger.debug(`Unhandled LiveKit webhook event: ${eventName}`)
				return
			}
		}

		try {
			await this.auditService.log({
				facilityId: appointment.facilityId,
				userId: actorUserId,
				staffProfileId: appointment.clinicianStaffId,
				action: "update",
				entityType: "telemedicine_appointment_session",
				entityId: appointmentId,
				beforeState: null,
				afterState: null,
				ipAddress: null,
				userAgent: null,
				metadata: auditMetadata,
				severity: "info",
				outcome: "success",
			})
		} catch (error) {
			this.logger.error(
				`Failed to write LiveKit webhook audit log for appointment ${appointmentId}: ${error}`
			)
		}
	}

	async regeneratePatientInvite(appointmentId: string, staffProfileId: string) {
		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				scheduledDate: telemedicineAppointments.scheduledDate,
				scheduledTime: telemedicineAppointments.scheduledTime,
				durationMinutes: telemedicineAppointments.durationMinutes,
			})
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)

		if (!appointment) {
			throw new NotFoundException(`Telemedicine appointment ${appointmentId} not found`)
		}

		this.assertAssignedClinician(
			staffProfileId,
			appointment.clinicianStaffId,
			"manage this patient invite"
		)

		const patientInvite = this.buildPatientInvite(appointment)
		const [updated] = await db
			.update(telemedicineAppointments)
			.set({
				patientInviteTokenHash: patientInvite.patientInviteTokenHash,
				patientInviteExpiresAt: patientInvite.patientInviteExpiresAt,
				patientInviteRevokedAt: null,
				patientInviteLastUsedAt: null,
				updatedAt: new Date(),
			})
			.where(eq(telemedicineAppointments.id, appointmentId))
			.returning({
				id: telemedicineAppointments.id,
				patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
				patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
			})

		if (!updated?.patientInviteExpiresAt) {
			throw new Error("Failed to regenerate patient invite")
		}

		await this.writeTelemedicineAudit({
			facilityId: appointment.facilityId,
			staffProfileId,
			action: "update",
			entityType: "telemedicine_patient_invite",
			entityId: appointmentId,
			afterState: {
				patientInviteExpiresAt: updated.patientInviteExpiresAt.toISOString(),
				patientInviteRevokedAt: this.serializeDate(updated.patientInviteRevokedAt),
			},
			metadata: { action: "regenerate" },
		})

		return {
			appointmentId,
			patientInviteToken: patientInvite.patientInviteToken,
			patientInviteExpiresAt: updated.patientInviteExpiresAt.toISOString(),
			patientInviteRevokedAt: this.serializeDate(updated.patientInviteRevokedAt),
		}
	}

	async revokePatientInvite(appointmentId: string, staffProfileId: string) {
		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				patientInviteTokenHash: telemedicineAppointments.patientInviteTokenHash,
				patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
				patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
			})
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)

		if (!appointment) {
			throw new NotFoundException(`Telemedicine appointment ${appointmentId} not found`)
		}

		this.assertAssignedClinician(
			staffProfileId,
			appointment.clinicianStaffId,
			"manage this patient invite"
		)

		const wasAlreadyRevoked = Boolean(appointment.patientInviteRevokedAt)
		const revokedAt = appointment.patientInviteRevokedAt ?? new Date()
		const [updated] = await db
			.update(telemedicineAppointments)
			.set({ patientInviteRevokedAt: revokedAt, updatedAt: new Date() })
			.where(eq(telemedicineAppointments.id, appointmentId))
			.returning({
				id: telemedicineAppointments.id,
				patientInviteTokenHash: telemedicineAppointments.patientInviteTokenHash,
				patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
				patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
			})

		if (!wasAlreadyRevoked) {
			await this.writeTelemedicineAudit({
				facilityId: appointment.facilityId,
				staffProfileId,
				action: "update",
				entityType: "telemedicine_patient_invite",
				entityId: appointmentId,
				afterState: { patientInviteRevokedAt: revokedAt.toISOString() },
				metadata: { action: "revoke" },
				severity: "warning",
			})
		}

		return this.buildInviteStatus(updated ?? { ...appointment, patientInviteRevokedAt: revokedAt })
	}

	private async resolvePatientInvite(token: string) {
		const tokenHash = hashPatientInviteToken(token)
		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const [appointment] = await db
			.select({
				id: telemedicineAppointments.id,
				facilityId: telemedicineAppointments.facilityId,
				patientId: telemedicineAppointments.patientId,
				clinicianStaffId: telemedicineAppointments.clinicianStaffId,
				scheduledDate: telemedicineAppointments.scheduledDate,
				scheduledTime: telemedicineAppointments.scheduledTime,
				durationMinutes: telemedicineAppointments.durationMinutes,
				status: telemedicineAppointments.status,
				livekitRoomName: telemedicineAppointments.livekitRoomName,
				livekitSessionStartedAt: telemedicineAppointments.livekitSessionStartedAt,
				patientInviteExpiresAt: telemedicineAppointments.patientInviteExpiresAt,
				patientInviteRevokedAt: telemedicineAppointments.patientInviteRevokedAt,
				patientJoinedAt: telemedicineAppointments.patientJoinedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				clinicianName: clinicianStaff.name,
				facilityName: facilities.name,
			})
			.from(telemedicineAppointments)
			.innerJoin(patients, eq(telemedicineAppointments.patientId, patients.id))
			.innerJoin(facilities, eq(telemedicineAppointments.facilityId, facilities.id))
			.leftJoin(clinicianStaff, eq(telemedicineAppointments.clinicianStaffId, clinicianStaff.id))
			.where(eq(telemedicineAppointments.patientInviteTokenHash, tokenHash))
			.limit(1)

		if (!appointment) {
			throw new NotFoundException("Patient invite was not found.")
		}

		return appointment
	}

	async getPatientInvitePreview(input: { token: string }) {
		const appointment = await this.resolvePatientInvite(input.token)
		const now = new Date()
		const joinWindow = getTelemedicineJoinWindow(appointment)
		const isRevoked = Boolean(appointment.patientInviteRevokedAt)
		const isExpired =
			!appointment.patientInviteExpiresAt ||
			appointment.patientInviteExpiresAt <= now ||
			now > joinWindow.endsAt
		const canJoinNow =
			!isRevoked &&
			!isExpired &&
			isTelemedicineStatusJoinable(appointment.status) &&
			isWithinTelemedicineJoinWindow(joinWindow, now)

		return {
			isValid: true,
			isRevoked,
			isExpired,
			canJoinNow,
			appointmentStatus: appointment.status,
			scheduledDate: appointment.scheduledDate,
			scheduledTime: appointment.scheduledTime,
			durationMinutes: appointment.durationMinutes,
			clinicianName: appointment.clinicianName ?? "Clinician",
			facilityName: appointment.facilityName,
			joinWindowStartsAt: joinWindow.startsAt.toISOString(),
			joinWindowEndsAt: joinWindow.endsAt.toISOString(),
		}
	}

	async joinPatientLiveKitRoom(input: JoinPatientLiveKitRoomInput) {
		const appointment = await this.resolvePatientInvite(input.token)

		if (appointment.patientInviteRevokedAt) {
			await this.writeTelemedicineAudit({
				facilityId: appointment.facilityId,
				staffProfileId: null,
				action: "verify",
				entityType: "telemedicine_patient_invite",
				entityId: appointment.id,
				metadata: { reason: "invite_revoked", patientId: appointment.patientId },
				severity: "warning",
				outcome: "failure",
			})
			throw new BadRequestException("Patient invite has been revoked.")
		}

		this.assertAppointmentStatusJoinable(appointment.status)
		const joinWindow = this.assertAppointmentWithinJoinWindow(appointment)

		if (!appointment.patientInviteExpiresAt || appointment.patientInviteExpiresAt <= new Date()) {
			await this.writeTelemedicineAudit({
				facilityId: appointment.facilityId,
				staffProfileId: null,
				action: "verify",
				entityType: "telemedicine_patient_invite",
				entityId: appointment.id,
				metadata: { reason: "invite_expired", patientId: appointment.patientId },
				severity: "warning",
				outcome: "failure",
			})
			throw new BadRequestException("Patient invite has expired.")
		}

		const submittedMrn = input.mrn?.trim().toLowerCase()
		const submittedDateOfBirth = input.dateOfBirth?.trim()
		const storedDateOfBirth = appointment.patientDateOfBirth
		const mrnMatches = submittedMrn && submittedMrn === appointment.patientMrn.toLowerCase()
		const dateOfBirthMatches = submittedDateOfBirth && submittedDateOfBirth === storedDateOfBirth

		if (!mrnMatches && !dateOfBirthMatches) {
			await this.writeTelemedicineAudit({
				facilityId: appointment.facilityId,
				staffProfileId: null,
				action: "verify",
				entityType: "telemedicine_patient_invite",
				entityId: appointment.id,
				metadata: {
					reason: "verification_failed",
					patientId: appointment.patientId,
					submittedMrnProvided: Boolean(submittedMrn),
					submittedDobProvided: Boolean(submittedDateOfBirth),
				},
				severity: "warning",
				outcome: "failure",
			})
			throw new ForbiddenException("Patient verification failed.")
		}

		if (!this.liveKitService.isConfigured()) {
			return { isConfigured: false }
		}

		const now = new Date()
		const roomName = appointment.livekitRoomName ?? this.liveKitService.getRoomName(appointment.id)
		const remainingSeconds = Math.max(
			1,
			Math.floor((joinWindow.endsAt.getTime() - now.getTime()) / 1000)
		)
		const token = await this.liveKitService.generateToken({
			roomName,
			identity: `patient:${appointment.id}`,
			name: `${appointment.patientFirstName} ${appointment.patientLastName}`,
			role: "patient",
			appointmentId: appointment.id,
			ttl: Math.min(7200, remainingSeconds),
		})

		const updates: Partial<typeof telemedicineAppointments.$inferInsert> = {
			patientInviteLastUsedAt: now,
			patientJoinedAt: appointment.patientJoinedAt ?? now,
			updatedAt: now,
		}
		if (!appointment.livekitRoomName) updates.livekitRoomName = roomName
		if (!appointment.livekitSessionStartedAt) updates.livekitSessionStartedAt = now
		if (this.shouldStartLiveKitSession(appointment.status)) updates.status = "in-progress"

		await db
			.update(telemedicineAppointments)
			.set(updates)
			.where(eq(telemedicineAppointments.id, appointment.id))

		await this.writeTelemedicineAudit({
			facilityId: appointment.facilityId,
			staffProfileId: null,
			action: "create",
			entityType: "telemedicine_livekit_token",
			entityId: appointment.id,
			afterState: { role: "patient", roomName, identity: `patient:${appointment.id}` },
			metadata: {
				patientId: appointment.patientId,
				verifiedWith: mrnMatches ? "mrn" : "dob",
				ttlSeconds: Math.min(7200, remainingSeconds),
			},
		})

		return {
			isConfigured: true,
			token,
			wsUrl: env.LIVEKIT_WS_URL,
			roomName,
		}
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
		let linkedEncounterStatus: string | null = null
		if (row.linkedEncounterId) {
			const [linkedEnc] = await db
				.select({ id: encounters.id, status: encounters.status })
				.from(encounters)
				.where(eq(encounters.id, row.linkedEncounterId))
			linkedEncounterNumber = linkedEnc ? `ENC-${linkedEnc.id.slice(0, 8).toUpperCase()}` : null
			linkedEncounterStatus = linkedEnc?.status ?? null
		}

		return {
			id: row.id,
			appointmentId: row.appointmentId,
			encounterType: row.encounterType,
			linkedEncounterId: row.linkedEncounterId ?? null,
			linkedEncounterNumber,
			linkedEncounterStatus,
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

		if (input.encounterType === "linked" && !input.linkedEncounterId) {
			throw new BadRequestException(
				"linkedEncounterId is required for linked telemedicine encounters."
			)
		}

		if (input.encounterType === "standalone" && input.linkedEncounterId) {
			throw new BadRequestException(
				"linkedEncounterId is only allowed for linked telemedicine encounters."
			)
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

		await this.writeTelemedicineAudit({
			facilityId: appt.facilityId,
			staffProfileId: createdByStaffId ?? null,
			action: "create",
			entityType: "telemedicine_encounter",
			entityId: created.id,
			afterState: {
				appointmentId: input.appointmentId,
				encounterType: input.encounterType,
				linkedEncounterId: input.linkedEncounterId ?? null,
				diagnosis: input.diagnosis,
				icdCode: input.icdCode ?? null,
			},
		})

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

		const apptFacilityId = await this.resolveAppointmentFacilityForAudit(enc.appointmentId)
		if (apptFacilityId) {
			await this.writeTelemedicineAudit({
				facilityId: apptFacilityId,
				staffProfileId: createdByStaffId ?? null,
				action: "create",
				entityType: "telemedicine_prescription",
				entityId: created.id,
				afterState: {
					encounterId: input.encounterId,
					medicationsCount: input.medications.length,
					prcLicenseNumber: staff.prcLicenseNumber,
					ptrNumber: staff.ptrNumber,
				},
				metadata: {
					genericNames: input.medications.map(m => m.genericName.trim()),
				},
			})
		}

		this.logger.log(`Created telemedicine prescription: ${created.id}`)
		return this.getPrescription({ id: created.id })
	}

	private async resolveAppointmentFacilityForAudit(appointmentId: string): Promise<string | null> {
		const [row] = await db
			.select({ facilityId: telemedicineAppointments.facilityId })
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))
			.limit(1)
		return row?.facilityId ?? null
	}

	async signPrescription(input: SignPrescriptionInput, signedByStaffId?: string) {
		const [row] = await db
			.select({
				id: telemedicinePrescriptions.id,
				status: telemedicinePrescriptions.status,
				clinicianStaffId: telemedicineEncounters.clinicianStaffId,
				facilityId: telemedicineAppointments.facilityId,
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

		const signedAt = new Date()
		await db
			.update(telemedicinePrescriptions)
			.set({
				status: "signed",
				prcLicenseNumber: staff.prcLicenseNumber,
				ptrNumber: staff.ptrNumber,
				signedAt,
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: signedAt,
			})
			.where(eq(telemedicinePrescriptions.id, input.id))

		await this.writeTelemedicineAudit({
			facilityId: row.facilityId,
			staffProfileId: signedByStaffId ?? null,
			action: "sign",
			entityType: "telemedicine_prescription",
			entityId: input.id,
			beforeState: { status: row.status },
			afterState: {
				status: "signed",
				signedAt: signedAt.toISOString(),
				prcLicenseNumber: staff.prcLicenseNumber,
				ptrNumber: staff.ptrNumber,
			},
		})

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

		const sentAt = new Date()
		await db
			.update(telemedicinePrescriptions)
			.set({
				status: "sent",
				sentAt,
				sentToEmail: input.email,
				updatedAt: sentAt,
			})
			.where(eq(telemedicinePrescriptions.id, input.id))

		// Attempt SMTP delivery with the signed PDF as attachment. Falls back to
		// log-only when MAILER_MODE != "smtp" or SMTP env is incomplete.
		let mailResult: { delivered: boolean; messageId: string | null; transport: "smtp" | "log" } = {
			delivered: false,
			messageId: null,
			transport: "log",
		}
		let mailerError: string | null = null
		try {
			const pdf = await this.generatePrescriptionPdf(input.id, sentByStaffId)
			mailResult = await this.mailerService.send({
				to: input.email,
				subject: `E-Prescription from ${row.facilityId ? "your clinician" : "the clinic"}`,
				text: `Your signed e-prescription is attached.\n\nPatient: ${row.patientLastName}, ${row.patientFirstName}\nIf you have questions, contact your clinic.`,
				attachments: [
					{
						filename: `prescription-${input.id}.pdf`,
						content: pdf,
						contentType: "application/pdf",
					},
				],
			})
		} catch (error) {
			mailerError = error instanceof Error ? error.message : String(error)
			this.logger.error(`Mailer send failed for prescription ${input.id}: ${mailerError}`)
		}

		await this.notificationService.send({
			facilityId: row.facilityId,
			recipientStaffId: row.clinicianStaffId,
			topic: "system",
			title: "Prescription Sent",
			body: mailResult.delivered
				? `E-prescription for ${row.patientLastName}, ${row.patientFirstName} emailed to ${input.email}.`
				: `E-prescription for ${row.patientLastName}, ${row.patientFirstName} marked sent to ${input.email}. ${mailerError ? `Email delivery failed: ${mailerError}` : "SMTP is not configured; email was not delivered."}`,
			data: {
				prescriptionId: input.id,
				email: input.email,
				mailDelivered: mailResult.delivered,
				mailTransport: mailResult.transport,
			},
		})

		await this.writeTelemedicineAudit({
			facilityId: row.facilityId,
			staffProfileId: sentByStaffId ?? null,
			action: "update",
			entityType: "telemedicine_prescription",
			entityId: input.id,
			afterState: {
				status: "sent",
				sentAt: sentAt.toISOString(),
				sentToEmail: input.email,
			},
			metadata: {
				mailerConfigured: this.mailerService.isConfigured(),
				mailDelivered: mailResult.delivered,
				mailTransport: mailResult.transport,
				messageId: mailResult.messageId,
				mailerError,
			},
			severity: mailResult.delivered ? "info" : "warning",
		})

		this.logger.log(
			`Marked telemedicine prescription ${input.id} sent to ${input.email} (delivered=${mailResult.delivered})`
		)
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

	async generateAbstractPdf(id: string, requesterStaffId?: string): Promise<Uint8Array> {
		const abstract = await this.getAbstract({ id })
		const [row] = await db
			.select({ clinicianStaffId: telemedicineEncounters.clinicianStaffId })
			.from(telemedicineAbstracts)
			.innerJoin(
				telemedicineEncounters,
				eq(telemedicineAbstracts.encounterId, telemedicineEncounters.id)
			)
			.where(eq(telemedicineAbstracts.id, id))
			.limit(1)

		if (!row) {
			throw new NotFoundException(`Tele-abstract ${id} not found`)
		}

		this.assertAssignedClinician(requesterStaffId, row.clinicianStaffId, "download this abstract")
		if (abstract.status === "draft" || !abstract.signedAt) {
			throw new BadRequestException("Abstract must be signed before PDF generation.")
		}

		const pdf = await PDFDocument.create()
		const page = pdf.addPage([612, 792])
		const font = await pdf.embedFont(StandardFonts.Helvetica)
		const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
		const margin = 48
		const contentWidth = 612 - margin * 2
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

		const drawWrapped = (text: string, size = 10) => {
			if (!text) {
				drawText("--", margin, size)
				return
			}
			const avgCharWidth = size * 0.5
			const maxChars = Math.max(20, Math.floor(contentWidth / avgCharWidth))
			for (const paragraph of text.split(/\r?\n/)) {
				if (paragraph.length === 0) {
					y -= size + 8
					continue
				}
				const words = paragraph.split(/\s+/)
				let line = ""
				for (const word of words) {
					const next = line ? `${line} ${word}` : word
					if (next.length > maxChars && line) {
						drawText(line, margin, size)
						line = word
					} else {
						line = next
					}
				}
				if (line) drawText(line, margin, size)
			}
		}

		drawText(abstract.facilityName, margin, 16, true)
		y -= 4
		drawText("TELEMEDICINE ENCOUNTER ABSTRACT", margin, 14, true)
		y -= 4
		drawText(`Patient: ${abstract.patientName}`, margin, 10, true)
		drawText(
			`Clinician: ${abstract.clinicianName}    PRC #${abstract.clinicianPrcNumber || "--"}`,
			margin
		)
		drawText(`Generated: ${new Date(abstract.createdAt).toLocaleString("en-PH")}`, margin)
		y -= 6

		const section = (title: string, body: string) => {
			drawText(title, margin, 11, true)
			drawWrapped(body, 10)
			y -= 4
		}

		section("Chief Complaint", abstract.chiefComplaint || "--")
		section("Subjective", abstract.subjectiveNotes || "--")
		section("Objective", abstract.objectiveNotes || "--")
		section("Assessment", abstract.assessmentNotes || "--")
		section("Plan", abstract.planNotes || "--")
		section(
			"Diagnosis",
			`${abstract.diagnosis || "--"}${abstract.icdCode ? `\nICD-10: ${abstract.icdCode}` : ""}`
		)
		if (abstract.additionalNotes) section("Additional Notes", abstract.additionalNotes)

		y = Math.max(y - 24, 120)
		drawText(abstract.clinicianName, 360, 11, true)
		drawText(`PRC #${abstract.clinicianPrcNumber || "--"}`, 360)
		if (abstract.signedAt)
			drawText(`Signed: ${new Date(abstract.signedAt).toLocaleString("en-PH")}`, 360, 8)
		page.drawLine({
			start: { x: 360, y: y + 8 },
			end: { x: 540, y: y + 8 },
			thickness: 1,
			color: rgb(0.2, 0.2, 0.2),
		})
		drawText("Physician Signature over Printed Name", 360, 8)

		return pdf.save()
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

		const apptFacilityId = await this.resolveAppointmentFacilityForAudit(enc.appointmentId)
		if (apptFacilityId) {
			await this.writeTelemedicineAudit({
				facilityId: apptFacilityId,
				staffProfileId: createdByStaffId ?? null,
				action: "create",
				entityType: "telemedicine_abstract",
				entityId: created.id,
				afterState: {
					encounterId: input.encounterId,
					diagnosis: enc.diagnosis,
					icdCode: enc.icdCode ?? null,
				},
			})
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

		const signingStaff = await this.getClinicalSigningStaff(signedByStaffId)

		const signedAt = new Date()
		await db
			.update(telemedicineAbstracts)
			.set({
				status: "signed",
				signedAt,
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: signedAt,
			})
			.where(eq(telemedicineAbstracts.id, input.id))

		// Mark encounter as signed
		await db
			.update(telemedicineEncounters)
			.set({
				status: "signed",
				signedAt,
				signedByStaffId: signedByStaffId ?? null,
				updatedAt: signedAt,
			})
			.where(eq(telemedicineEncounters.id, abstract.encounterId))

		const apptFacilityId = await this.resolveAppointmentFacilityForAudit(abstract.appointmentId)
		if (apptFacilityId) {
			await this.writeTelemedicineAudit({
				facilityId: apptFacilityId,
				staffProfileId: signedByStaffId ?? null,
				action: "sign",
				entityType: "telemedicine_abstract",
				entityId: input.id,
				beforeState: { status: abstract.status },
				afterState: {
					status: "signed",
					signedAt: signedAt.toISOString(),
					encounterStatus: "signed",
					prcLicenseNumber: signingStaff.prcLicenseNumber,
				},
			})
		}

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

		const sentAt = new Date()
		await db
			.update(telemedicineAbstracts)
			.set({
				status: "sent",
				sentAt,
				sentToEmail: input.email,
				updatedAt: sentAt,
			})
			.where(eq(telemedicineAbstracts.id, input.id))

		// Mark encounter as finalized after abstract is sent
		await db
			.update(telemedicineEncounters)
			.set({ status: "finalized", updatedAt: sentAt })
			.where(eq(telemedicineEncounters.id, abstract.encounterId))

		await db
			.update(telemedicineAppointments)
			.set({ status: "completed", updatedAt: sentAt })
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
			let mailResult: { delivered: boolean; messageId: string | null; transport: "smtp" | "log" } =
				{
					delivered: false,
					messageId: null,
					transport: "log",
				}
			let mailerError: string | null = null
			try {
				const pdf = await this.generateAbstractPdf(input.id, sentByStaffId)
				mailResult = await this.mailerService.send({
					to: input.email,
					subject: `Telemedicine Encounter Abstract`,
					text: `Your signed clinical abstract is attached.\n\nPatient: ${notificationTarget.patientLastName}, ${notificationTarget.patientFirstName}\nIf you have questions, contact your clinic.`,
					attachments: [
						{
							filename: `abstract-${input.id}.pdf`,
							content: pdf,
							contentType: "application/pdf",
						},
					],
				})
			} catch (error) {
				mailerError = error instanceof Error ? error.message : String(error)
				this.logger.error(`Mailer send failed for abstract ${input.id}: ${mailerError}`)
			}

			await this.notificationService.send({
				facilityId: notificationTarget.facilityId,
				recipientStaffId: notificationTarget.clinicianStaffId,
				topic: "system",
				title: "Abstract Sent",
				body: mailResult.delivered
					? `Tele-abstract for ${notificationTarget.patientLastName}, ${notificationTarget.patientFirstName} emailed to ${input.email}.`
					: `Tele-abstract for ${notificationTarget.patientLastName}, ${notificationTarget.patientFirstName} marked sent to ${input.email}. ${mailerError ? `Email delivery failed: ${mailerError}` : "SMTP is not configured; email was not delivered."}`,
				data: {
					abstractId: input.id,
					email: input.email,
					sentByStaffId: sentByStaffId ?? null,
					mailDelivered: mailResult.delivered,
					mailTransport: mailResult.transport,
				},
			})

			await this.writeTelemedicineAudit({
				facilityId: notificationTarget.facilityId,
				staffProfileId: sentByStaffId ?? null,
				action: "update",
				entityType: "telemedicine_abstract",
				entityId: input.id,
				afterState: {
					status: "sent",
					sentAt: sentAt.toISOString(),
					sentToEmail: input.email,
					encounterStatus: "finalized",
					appointmentStatus: "completed",
				},
				metadata: {
					mailerConfigured: this.mailerService.isConfigured(),
					mailDelivered: mailResult.delivered,
					mailTransport: mailResult.transport,
					messageId: mailResult.messageId,
					mailerError,
				},
				severity: mailResult.delivered ? "info" : "warning",
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
