import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { randomUUID } from "crypto"
import { and, asc, desc, eq, isNull } from "drizzle-orm"

import {
	opdTeleTriageIntakes,
	opdTriageIntakes,
	patients,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { LiveKitService } from "@/common/livekit/livekit.service"
import type { V1Inputs } from "@/config/contract-types"
import { env } from "@/config/env.config"

import { NotificationService } from "../notifications/notification.service"

type CreateOpdTriageInput = V1Inputs["opdTriage"]["create"]
type GetOpdTriageInput = V1Inputs["opdTriage"]["get"]
type ListPendingTriageInput = V1Inputs["opdTriage"]["listPending"]
type LinkOpdTriageToPatientInput = V1Inputs["opdTriage"]["linkToPatient"]
type CreateOpdTeleTriageInput = V1Inputs["opdTriage"]["createRemoteIntake"]
type ListOpdTeleTriageInput = V1Inputs["opdTriage"]["listRemoteIntakes"]
type OpdTeleTriageIdInput = V1Inputs["opdTriage"]["markRemoteArrived"]
type CancelOpdTeleTriageInput = V1Inputs["opdTriage"]["cancelRemoteIntake"]
type OpdTeleTriageLiveKitInput = V1Inputs["opdTriage"]["joinRemoteLiveKitRoom"]
type DBTransaction = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0]
type OpdTeleTriageRecord = typeof opdTeleTriageIntakes.$inferSelect

@Injectable()
export class OpdTriageService {
	private readonly logger = new Logger(OpdTriageService.name)

	constructor(
		@Inject(NotificationService)
		private readonly notificationService: NotificationService,
		@Inject(LiveKitService)
		private readonly liveKitService: LiveKitService
	) {}

	async create(input: CreateOpdTriageInput) {
		// When patientId is provided, validate the patient exists
		if (input.patientId) {
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(eq(patients.id, input.patientId))

			if (!patient) {
				throw new NotFoundException(`Patient ${input.patientId} not found`)
			}
		}

		const [intake] = await db
			.insert(opdTriageIntakes)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId ?? null,
				chiefComplaint: input.chiefComplaint,
				systolicBp: input.systolicBp ?? null,
				diastolicBp: input.diastolicBp ?? null,
				temperatureCelsius: input.temperatureCelsius ?? null,
				heartRateBpm: input.heartRateBpm ?? null,
				respiratoryRate: input.respiratoryRate ?? null,
				oxygenSatPct: input.oxygenSatPct ?? null,
				heightCm: input.heightCm ?? null,
				weightKg: input.weightKg ?? null,
				triageNurseStaffId: input.triageNurseStaffId ?? null,
				clinicianStaffId: input.clinicianStaffId ?? null,
			})
			.returning()

		this.logger.log(
			input.patientId
				? `Created OPD triage intake for patient ${input.patientId}`
				: `Created pre-registration OPD triage intake (no patient yet)`
		)
		return intake!
	}

	async findById(input: GetOpdTriageInput) {
		const triageNurseStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("triage_nurse_staff")

		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const [row] = await db
			.select({
				id: opdTriageIntakes.id,
				facilityId: opdTriageIntakes.facilityId,
				patientId: opdTriageIntakes.patientId,
				arrivalTime: opdTriageIntakes.arrivalTime,
				chiefComplaint: opdTriageIntakes.chiefComplaint,
				systolicBp: opdTriageIntakes.systolicBp,
				diastolicBp: opdTriageIntakes.diastolicBp,
				temperatureCelsius: opdTriageIntakes.temperatureCelsius,
				heartRateBpm: opdTriageIntakes.heartRateBpm,
				respiratoryRate: opdTriageIntakes.respiratoryRate,
				oxygenSatPct: opdTriageIntakes.oxygenSatPct,
				heightCm: opdTriageIntakes.heightCm,
				weightKg: opdTriageIntakes.weightKg,
				triageNurseStaffId: opdTriageIntakes.triageNurseStaffId,
				clinicianStaffId: opdTriageIntakes.clinicianStaffId,
				status: opdTriageIntakes.status,
				encounterId: opdTriageIntakes.encounterId,
				createdAt: opdTriageIntakes.createdAt,
				updatedAt: opdTriageIntakes.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				triageNurseName: triageNurseStaff.name,
				clinicianName: clinicianStaff.name,
			})
			.from(opdTriageIntakes)
			// leftJoin supports pre-registration intakes that have no patient yet
			.leftJoin(patients, eq(opdTriageIntakes.patientId, patients.id))
			.leftJoin(triageNurseStaff, eq(opdTriageIntakes.triageNurseStaffId, triageNurseStaff.id))
			.leftJoin(clinicianStaff, eq(opdTriageIntakes.clinicianStaffId, clinicianStaff.id))
			.where(eq(opdTriageIntakes.id, input.id))

		if (!row) {
			throw new NotFoundException(`OPD triage intake ${input.id} not found`)
		}

		return {
			...row,
			patientFirstName: row.patientFirstName ?? null,
			patientLastName: row.patientLastName ?? null,
			patientMrn: row.patientMrn ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			triageNurseName: row.triageNurseName ?? null,
			clinicianName: row.clinicianName ?? null,
		}
	}

	async listPending(input: ListPendingTriageInput) {
		const conditions = [eq(opdTriageIntakes.facilityId, input.facilityId)]

		if (input.status) {
			conditions.push(eq(opdTriageIntakes.status, input.status))
		} else {
			conditions.push(eq(opdTriageIntakes.status, "pending_registration"))
		}

		if (input.clinicianStaffId) {
			conditions.push(eq(opdTriageIntakes.clinicianStaffId, input.clinicianStaffId))
		}

		const triageNurseStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("triage_nurse_staff")

		const clinicianStaff = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("clinician_staff")

		const rows = await db
			.select({
				id: opdTriageIntakes.id,
				facilityId: opdTriageIntakes.facilityId,
				patientId: opdTriageIntakes.patientId,
				arrivalTime: opdTriageIntakes.arrivalTime,
				chiefComplaint: opdTriageIntakes.chiefComplaint,
				systolicBp: opdTriageIntakes.systolicBp,
				diastolicBp: opdTriageIntakes.diastolicBp,
				temperatureCelsius: opdTriageIntakes.temperatureCelsius,
				heartRateBpm: opdTriageIntakes.heartRateBpm,
				respiratoryRate: opdTriageIntakes.respiratoryRate,
				oxygenSatPct: opdTriageIntakes.oxygenSatPct,
				heightCm: opdTriageIntakes.heightCm,
				weightKg: opdTriageIntakes.weightKg,
				triageNurseStaffId: opdTriageIntakes.triageNurseStaffId,
				clinicianStaffId: opdTriageIntakes.clinicianStaffId,
				status: opdTriageIntakes.status,
				encounterId: opdTriageIntakes.encounterId,
				createdAt: opdTriageIntakes.createdAt,
				updatedAt: opdTriageIntakes.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				triageNurseName: triageNurseStaff.name,
				clinicianName: clinicianStaff.name,
			})
			.from(opdTriageIntakes)
			// leftJoin supports pre-registration intakes that have no patient yet
			.leftJoin(patients, eq(opdTriageIntakes.patientId, patients.id))
			.leftJoin(triageNurseStaff, eq(opdTriageIntakes.triageNurseStaffId, triageNurseStaff.id))
			.leftJoin(clinicianStaff, eq(opdTriageIntakes.clinicianStaffId, clinicianStaff.id))
			.where(and(...conditions))
			.orderBy(desc(opdTriageIntakes.arrivalTime))

		return rows.map(row => ({
			...row,
			patientFirstName: row.patientFirstName ?? null,
			patientLastName: row.patientLastName ?? null,
			patientMrn: row.patientMrn ?? null,
			patientName:
				row.patientLastName && row.patientFirstName
					? `${row.patientLastName}, ${row.patientFirstName}`
					: null,
			triageNurseName: row.triageNurseName ?? null,
			clinicianName: row.clinicianName ?? null,
		}))
	}

	async linkToPatient(input: LinkOpdTriageToPatientInput) {
		// Validate the triage intake exists and is still in pre-registration state
		const [existing] = await db
			.select({
				id: opdTriageIntakes.id,
				patientId: opdTriageIntakes.patientId,
				status: opdTriageIntakes.status,
			})
			.from(opdTriageIntakes)
			.where(eq(opdTriageIntakes.id, input.id))

		if (!existing) {
			throw new NotFoundException(`OPD triage intake ${input.id} not found`)
		}

		// Validate the target patient exists
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found`)
		}

		const [updated] = await db
			.update(opdTriageIntakes)
			.set({
				patientId: input.patientId,
				status: "registered",
				updatedAt: new Date(),
			})
			.where(eq(opdTriageIntakes.id, input.id))
			.returning()

		this.logger.log(`Linked triage intake ${input.id} to patient ${input.patientId}`)
		return updated!
	}

	async createRemoteIntake(input: CreateOpdTeleTriageInput) {
		if (input.patientId) {
			await this.assertPatientExists(input.patientId)
		}

		const id = randomUUID()
		const etaAt =
			input.etaMinutes !== undefined ? new Date(Date.now() + input.etaMinutes * 60_000) : null
		const scheduledArrivalTime = input.scheduledArrivalTime
			? new Date(input.scheduledArrivalTime)
			: null
		const videoSessionId =
			input.videoSessionId ?? (input.channelType === "video" ? this.getRemoteRoomName(id) : null)

		const [intake] = await db
			.insert(opdTeleTriageIntakes)
			.values({
				id,
				facilityId: input.facilityId,
				callerName: input.callerName,
				callerRelationship: input.callerRelationship ?? null,
				patientId: input.patientId ?? null,
				patientLocation: input.patientLocation,
				channelType: input.channelType,
				videoLink: input.videoLink ?? null,
				videoSessionId,
				scheduledArrivalTime,
				etaMinutes: input.etaMinutes ?? null,
				etaAt,
				chiefComplaint: input.chiefComplaint,
				assessmentNotes: input.assessmentNotes ?? "",
				provisionalAcuity: input.provisionalAcuity,
				systolicBp: input.systolicBp ?? null,
				diastolicBp: input.diastolicBp ?? null,
				temperatureCelsius: input.temperatureCelsius ?? null,
				heartRateBpm: input.heartRateBpm ?? null,
				respiratoryRate: input.respiratoryRate ?? null,
				oxygenSatPct: input.oxygenSatPct ?? null,
				status: "pending_arrival",
				triageStaffId: input.triageStaffId,
			})
			.returning()

		this.logger.log(`Created OPD tele-triage intake ${intake!.id}`)
		this.notificationService.broadcast(
			"tele_triage",
			`Inbound OPD ${input.provisionalAcuity} patient`,
			`${input.callerName} · ${input.patientLocation}`
		)

		return this.mapRemoteIntake(intake!)
	}

	async listRemoteIntakes(input: ListOpdTeleTriageInput) {
		const conditions = [eq(opdTeleTriageIntakes.facilityId, input.facilityId)]
		if (input.status) {
			conditions.push(eq(opdTeleTriageIntakes.status, input.status))
		}

		const rows = await db
			.select()
			.from(opdTeleTriageIntakes)
			.where(and(...conditions))
			.orderBy(
				asc(opdTeleTriageIntakes.etaAt),
				asc(opdTeleTriageIntakes.scheduledArrivalTime),
				desc(opdTeleTriageIntakes.createdAt)
			)

		return rows.map(row => this.mapRemoteIntake(row))
	}

	async findRemoteIntakeFacility(id: string) {
		const [record] = await db
			.select({ facilityId: opdTeleTriageIntakes.facilityId })
			.from(opdTeleTriageIntakes)
			.where(eq(opdTeleTriageIntakes.id, id))
			.limit(1)

		if (!record) {
			throw new NotFoundException(`OPD tele-triage intake ${id} not found`)
		}

		return record
	}

	async markRemoteArrived(input: OpdTeleTriageIdInput) {
		const result = await db.transaction(async tx => {
			const now = new Date()
			const remoteIntake = await this.claimRemoteArrival(tx, input.id, now)

			const [triageIntake] = await tx
				.insert(opdTriageIntakes)
				.values({
					facilityId: remoteIntake.facilityId,
					patientId: remoteIntake.patientId,
					arrivalTime: now,
					chiefComplaint: remoteIntake.chiefComplaint,
					systolicBp: remoteIntake.systolicBp,
					diastolicBp: remoteIntake.diastolicBp,
					temperatureCelsius: remoteIntake.temperatureCelsius,
					heartRateBpm: remoteIntake.heartRateBpm,
					respiratoryRate: remoteIntake.respiratoryRate,
					oxygenSatPct: remoteIntake.oxygenSatPct,
					triageNurseStaffId: remoteIntake.triageStaffId,
				})
				.returning()

			const [linked] = await tx
				.update(opdTeleTriageIntakes)
				.set({
					linkedTriageIntakeId: triageIntake!.id,
					updatedAt: now,
				})
				.where(
					and(
						eq(opdTeleTriageIntakes.id, input.id),
						eq(opdTeleTriageIntakes.status, "arrived"),
						isNull(opdTeleTriageIntakes.linkedTriageIntakeId)
					)
				)
				.returning({ id: opdTeleTriageIntakes.id })

			if (!linked) {
				throw new BadRequestException("Remote intake is already linked to an OPD triage intake")
			}

			return { remoteIntake, triageIntakeId: triageIntake!.id }
		})

		this.logger.log(
			`OPD tele-triage ${input.id} arrived -> OPD triage intake ${result.triageIntakeId}`
		)
		this.notificationService.broadcast(
			"tele_triage",
			"OPD tele-triage patient arrived",
			`${result.remoteIntake.callerName} checked in for OPD triage`
		)

		return { id: input.id, triageIntakeId: result.triageIntakeId }
	}

	async cancelRemoteIntake(input: CancelOpdTeleTriageInput) {
		const [existing] = await db
			.select()
			.from(opdTeleTriageIntakes)
			.where(eq(opdTeleTriageIntakes.id, input.id))

		if (!existing) {
			throw new NotFoundException(`OPD tele-triage intake ${input.id} not found`)
		}

		if (existing.status !== "pending_arrival") {
			throw new BadRequestException("Only pending-arrival remote intakes can be cancelled")
		}

		const [updated] = await db
			.update(opdTeleTriageIntakes)
			.set({
				status: input.status,
				cancelReason: input.reason ?? null,
				updatedAt: new Date(),
			})
			.where(eq(opdTeleTriageIntakes.id, input.id))
			.returning()

		this.notificationService.broadcast(
			"tele_triage",
			input.status === "no_show" ? "OPD tele-triage no-show" : "OPD tele-triage cancelled",
			existing.callerName
		)

		return this.mapRemoteIntake(updated!)
	}

	async joinRemoteLiveKitRoom(input: OpdTeleTriageLiveKitInput, staffProfileId: string) {
		const [record] = await db
			.select({
				id: opdTeleTriageIntakes.id,
				facilityId: opdTeleTriageIntakes.facilityId,
				channelType: opdTeleTriageIntakes.channelType,
				status: opdTeleTriageIntakes.status,
				videoSessionId: opdTeleTriageIntakes.videoSessionId,
				livekitSessionStartedAt: opdTeleTriageIntakes.livekitSessionStartedAt,
			})
			.from(opdTeleTriageIntakes)
			.where(eq(opdTeleTriageIntakes.id, input.id))
			.limit(1)

		if (!record) {
			throw new NotFoundException(`OPD tele-triage intake ${input.id} not found`)
		}

		if (record.channelType !== "video") {
			throw new BadRequestException("Only video remote intakes can start a LiveKit session")
		}

		if (record.status !== "pending_arrival") {
			throw new BadRequestException(
				"Only pending-arrival remote intakes can start a LiveKit session"
			)
		}

		await this.assertStaffInFacility(staffProfileId, record.facilityId)

		if (!this.liveKitService.isConfigured()) {
			return { isConfigured: false }
		}

		const staffName = await this.getStaffName(staffProfileId)
		const roomName = record.videoSessionId ?? this.getRemoteRoomName(record.id)
		const token = await this.liveKitService.generateToken({
			roomName,
			identity: `opd-triage-staff:${staffProfileId}`,
			name: staffName ?? "Triage Officer",
			role: "clinician",
			appointmentId: record.id,
			ttl: "2h",
		})

		const now = new Date()
		const updates: Partial<typeof opdTeleTriageIntakes.$inferInsert> = { updatedAt: now }
		if (!record.videoSessionId) updates.videoSessionId = roomName
		if (!record.livekitSessionStartedAt) updates.livekitSessionStartedAt = now

		if (updates.videoSessionId || updates.livekitSessionStartedAt) {
			await db
				.update(opdTeleTriageIntakes)
				.set(updates)
				.where(eq(opdTeleTriageIntakes.id, record.id))
		}

		return {
			isConfigured: true,
			token,
			wsUrl: env.LIVEKIT_WS_URL,
			roomName,
		}
	}

	async endRemoteLiveKitSession(input: OpdTeleTriageLiveKitInput, staffProfileId: string) {
		const [record] = await db
			.select({
				id: opdTeleTriageIntakes.id,
				facilityId: opdTeleTriageIntakes.facilityId,
				channelType: opdTeleTriageIntakes.channelType,
				livekitSessionStartedAt: opdTeleTriageIntakes.livekitSessionStartedAt,
				livekitSessionEndedAt: opdTeleTriageIntakes.livekitSessionEndedAt,
			})
			.from(opdTeleTriageIntakes)
			.where(eq(opdTeleTriageIntakes.id, input.id))
			.limit(1)

		if (!record) {
			throw new NotFoundException(`OPD tele-triage intake ${input.id} not found`)
		}

		if (record.channelType !== "video") {
			throw new BadRequestException("Only video remote intakes have LiveKit sessions")
		}

		await this.assertStaffInFacility(staffProfileId, record.facilityId)

		if (record.livekitSessionEndedAt) {
			return {
				id: input.id,
				livekitSessionEndedAt: record.livekitSessionEndedAt.toISOString(),
			}
		}

		if (!record.livekitSessionStartedAt) {
			throw new BadRequestException("Video session has not started yet")
		}

		const endedAt = new Date()
		await db
			.update(opdTeleTriageIntakes)
			.set({ livekitSessionEndedAt: endedAt, updatedAt: endedAt })
			.where(eq(opdTeleTriageIntakes.id, input.id))

		return { id: input.id, livekitSessionEndedAt: endedAt.toISOString() }
	}

	private async claimRemoteArrival(tx: DBTransaction, id: string, now: Date) {
		const [claimed] = await tx
			.update(opdTeleTriageIntakes)
			.set({
				status: "arrived",
				arrivedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(opdTeleTriageIntakes.id, id),
					eq(opdTeleTriageIntakes.status, "pending_arrival"),
					isNull(opdTeleTriageIntakes.linkedTriageIntakeId)
				)
			)
			.returning()

		if (claimed) return claimed

		const [existing] = await tx
			.select()
			.from(opdTeleTriageIntakes)
			.where(eq(opdTeleTriageIntakes.id, id))

		if (!existing) {
			throw new NotFoundException(`OPD tele-triage intake ${id} not found`)
		}

		if (existing.linkedTriageIntakeId) {
			throw new BadRequestException("Remote intake is already linked to an OPD triage intake")
		}

		throw new BadRequestException("Remote intake is not pending arrival")
	}

	private async assertPatientExists(patientId: string) {
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.id, patientId))
		if (!patient) {
			throw new NotFoundException(`Patient ${patientId} not found`)
		}
	}

	private async assertStaffInFacility(staffProfileId: string, facilityId: string) {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.id, staffProfileId), eq(staffProfiles.facilityId, facilityId)))

		if (!profile) {
			throw new NotFoundException(
				`Staff profile ${staffProfileId} not found at facility ${facilityId}`
			)
		}
	}

	private async getStaffName(staffProfileId: string) {
		const [profile] = await db
			.select({ name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(staffProfiles.id, staffProfileId))
			.limit(1)

		return profile?.name ?? null
	}

	private getRemoteRoomName(id: string) {
		return `opd-triage-${id}`
	}

	private mapRemoteIntake(record: OpdTeleTriageRecord) {
		return {
			...record,
			callerRelationship: record.callerRelationship ?? null,
			patientId: record.patientId ?? null,
			videoLink: record.videoLink ?? null,
			videoSessionId: record.videoSessionId ?? null,
			livekitSessionStartedAt: record.livekitSessionStartedAt ?? null,
			livekitSessionEndedAt: record.livekitSessionEndedAt ?? null,
			scheduledArrivalTime: record.scheduledArrivalTime ?? null,
			etaMinutes: record.etaMinutes ?? null,
			etaAt: record.etaAt ?? null,
			systolicBp: record.systolicBp ?? null,
			diastolicBp: record.diastolicBp ?? null,
			temperatureCelsius: record.temperatureCelsius ?? null,
			heartRateBpm: record.heartRateBpm ?? null,
			respiratoryRate: record.respiratoryRate ?? null,
			oxygenSatPct: record.oxygenSatPct ?? null,
			arrivedAt: record.arrivedAt ?? null,
			linkedTriageIntakeId: record.linkedTriageIntakeId ?? null,
			cancelReason: record.cancelReason ?? null,
		}
	}
}
