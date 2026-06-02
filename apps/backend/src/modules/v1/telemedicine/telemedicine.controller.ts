import { Controller, Get, NotFoundException, Param, Res, Version } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { and, eq } from "drizzle-orm"
import type { Response } from "express"

import {
	staffProfiles,
	telemedicineAbstracts,
	telemedicineAppointments,
	telemedicineEncounters,
	telemedicinePrescriptions,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { TelemedicineService } from "./telemedicine.service"

@Controller()
export class TelemedicineController {
	constructor(private readonly telemedicineService: TelemedicineService) {}

	private async resolveStaffProfileId(userId: string, facilityId: string) {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.facilityId, facilityId)))
			.limit(1)

		if (!profile) {
			throw new NotFoundException(
				`Staff profile not found for user ${userId} at facility ${facilityId}`
			)
		}

		return profile.id
	}

	private async resolveAppointmentFacilityId(appointmentId: string) {
		const [appointment] = await db
			.select({ facilityId: telemedicineAppointments.facilityId })
			.from(telemedicineAppointments)
			.where(eq(telemedicineAppointments.id, appointmentId))

		return appointment?.facilityId
	}

	private async resolveEncounterFacilityId(encounterId: string) {
		const [encounter] = await db
			.select({ facilityId: telemedicineAppointments.facilityId })
			.from(telemedicineEncounters)
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicineEncounters.appointmentId, telemedicineAppointments.id)
			)
			.where(eq(telemedicineEncounters.id, encounterId))

		return encounter?.facilityId
	}

	private async resolveAbstractFacilityId(abstractId: string) {
		const [abstract] = await db
			.select({ facilityId: telemedicineAppointments.facilityId })
			.from(telemedicineAbstracts)
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicineAbstracts.appointmentId, telemedicineAppointments.id)
			)
			.where(eq(telemedicineAbstracts.id, abstractId))

		return abstract?.facilityId
	}

	private async resolvePrescriptionFacilityId(prescriptionId: string) {
		const [prescription] = await db
			.select({ facilityId: telemedicineAppointments.facilityId })
			.from(telemedicinePrescriptions)
			.innerJoin(
				telemedicineAppointments,
				eq(telemedicinePrescriptions.appointmentId, telemedicineAppointments.id)
			)
			.where(eq(telemedicinePrescriptions.id, prescriptionId))

		return prescription?.facilityId
	}

	// Appointments

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.listAppointments)
	async listAppointments() {
		return implement(v1.telemedicine.listAppointments).handler(async ({ input }) => {
			return this.telemedicineService.listAppointments(input)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.getAppointment)
	async getAppointment() {
		return implement(v1.telemedicine.getAppointment).handler(async ({ input }) => {
			return this.telemedicineService.getAppointment(input)
		})
	}

	@RequirePermission("telemedicine", "create")
	@Implement(v1.telemedicine.createAppointment)
	async createAppointment(@Session() session: UserSession) {
		return implement(v1.telemedicine.createAppointment).handler(async ({ input }) => {
			const staffProfileId = await this.resolveStaffProfileId(session.user.id, input.facilityId)
			return this.telemedicineService.createAppointment(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.updateAppointment)
	async updateAppointment(@Session() session: UserSession) {
		return implement(v1.telemedicine.updateAppointment).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.updateAppointment(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.cancelAppointment)
	async cancelAppointment(@Session() session: UserSession) {
		return implement(v1.telemedicine.cancelAppointment).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.cancelAppointment(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.joinLiveKitRoom)
	async joinLiveKitRoom(@Session() session: UserSession) {
		return implement(v1.telemedicine.joinLiveKitRoom).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			if (!staffProfileId) {
				throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
			}
			return this.telemedicineService.joinClinicianLiveKitRoom(input.id, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.endLiveKitSession)
	async endLiveKitSession(@Session() session: UserSession) {
		return implement(v1.telemedicine.endLiveKitSession).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			if (!staffProfileId) {
				throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
			}
			return this.telemedicineService.endClinicianLiveKitSession(input.id, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.regeneratePatientInvite)
	async regeneratePatientInvite(@Session() session: UserSession) {
		return implement(v1.telemedicine.regeneratePatientInvite).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			if (!staffProfileId) {
				throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
			}
			return this.telemedicineService.regeneratePatientInvite(input.id, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.revokePatientInvite)
	async revokePatientInvite(@Session() session: UserSession) {
		return implement(v1.telemedicine.revokePatientInvite).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			if (!staffProfileId) {
				throw new NotFoundException(`Telemedicine appointment ${input.id} not found`)
			}
			return this.telemedicineService.revokePatientInvite(input.id, staffProfileId)
		})
	}

	@AllowAnonymous()
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@Implement(v1.telemedicine.getPatientInvitePreview)
	async getPatientInvitePreview() {
		return implement(v1.telemedicine.getPatientInvitePreview).handler(async ({ input }) => {
			return this.telemedicineService.getPatientInvitePreview(input)
		})
	}

	@AllowAnonymous()
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Implement(v1.telemedicine.joinPatientLiveKitRoom)
	async joinPatientLiveKitRoom() {
		return implement(v1.telemedicine.joinPatientLiveKitRoom).handler(async ({ input }) => {
			return this.telemedicineService.joinPatientLiveKitRoom(input)
		})
	}

	// Encounters

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.getEncounter)
	async getEncounter() {
		return implement(v1.telemedicine.getEncounter).handler(async ({ input }) => {
			return this.telemedicineService.getEncounter(input)
		})
	}

	@RequirePermission("telemedicine", "create")
	@Implement(v1.telemedicine.createEncounter)
	async createEncounter(@Session() session: UserSession) {
		return implement(v1.telemedicine.createEncounter).handler(async ({ input }) => {
			const facilityId = await this.resolveAppointmentFacilityId(input.appointmentId)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.createEncounter(input, staffProfileId)
		})
	}

	// Prescriptions

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.getPrescription)
	async getPrescription() {
		return implement(v1.telemedicine.getPrescription).handler(async ({ input }) => {
			return this.telemedicineService.getPrescription(input)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.listPrescriptions)
	async listPrescriptions() {
		return implement(v1.telemedicine.listPrescriptions).handler(async ({ input }) => {
			return this.telemedicineService.listPrescriptions(input)
		})
	}

	@RequirePermission("telemedicine", "create")
	@Implement(v1.telemedicine.createPrescription)
	async createPrescription(@Session() session: UserSession) {
		return implement(v1.telemedicine.createPrescription).handler(async ({ input }) => {
			const facilityId = await this.resolveEncounterFacilityId(input.encounterId)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.createPrescription(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.signPrescription)
	async signPrescription(@Session() session: UserSession) {
		return implement(v1.telemedicine.signPrescription).handler(async ({ input }) => {
			const facilityId = await this.resolvePrescriptionFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.signPrescription(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.sendPrescription)
	async sendPrescription(@Session() session: UserSession) {
		return implement(v1.telemedicine.sendPrescription).handler(async ({ input }) => {
			const facilityId = await this.resolvePrescriptionFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.sendPrescription(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Version("1")
	@Get("telemedicine/prescriptions/:id/pdf")
	async getPrescriptionPdf(
		@Session() session: UserSession,
		@Param("id") id: string,
		@Res() res: Response
	) {
		const facilityId = await this.resolvePrescriptionFacilityId(id)
		const staffProfileId = facilityId
			? await this.resolveStaffProfileId(session.user.id, facilityId)
			: undefined
		const pdf = await this.telemedicineService.generatePrescriptionPdf(id, staffProfileId)
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader("Content-Disposition", `attachment; filename="prescription-${id}.pdf"`)
		res.send(Buffer.from(pdf))
	}

	// Abstracts

	@RequirePermission("telemedicine", "create")
	@Implement(v1.telemedicine.generateAbstract)
	async generateAbstract(@Session() session: UserSession) {
		return implement(v1.telemedicine.generateAbstract).handler(async ({ input }) => {
			const facilityId = await this.resolveEncounterFacilityId(input.encounterId)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.generateAbstract(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.getAbstract)
	async getAbstract() {
		return implement(v1.telemedicine.getAbstract).handler(async ({ input }) => {
			return this.telemedicineService.getAbstract(input)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Implement(v1.telemedicine.listEncounterAbstracts)
	async listEncounterAbstracts() {
		return implement(v1.telemedicine.listEncounterAbstracts).handler(async ({ input }) => {
			return this.telemedicineService.listEncounterAbstracts(input)
		})
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.signAbstract)
	async signAbstract(@Session() session: UserSession) {
		return implement(v1.telemedicine.signAbstract).handler(async ({ input }) => {
			const facilityId = await this.resolveAbstractFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.signAbstract(input, staffProfileId)
		})
	}

	@RequirePermission("telemedicine", "view")
	@Version("1")
	@Get("telemedicine/abstracts/:id/pdf")
	async getAbstractPdf(
		@Session() session: UserSession,
		@Param("id") id: string,
		@Res() res: Response
	) {
		const facilityId = await this.resolveAbstractFacilityId(id)
		const staffProfileId = facilityId
			? await this.resolveStaffProfileId(session.user.id, facilityId)
			: undefined
		const pdf = await this.telemedicineService.generateAbstractPdf(id, staffProfileId)
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader("Content-Disposition", `attachment; filename="abstract-${id}.pdf"`)
		res.send(Buffer.from(pdf))
	}

	@RequirePermission("telemedicine", "edit")
	@Implement(v1.telemedicine.sendAbstract)
	async sendAbstract(@Session() session: UserSession) {
		return implement(v1.telemedicine.sendAbstract).handler(async ({ input }) => {
			const facilityId = await this.resolveAbstractFacilityId(input.id)
			const staffProfileId = facilityId
				? await this.resolveStaffProfileId(session.user.id, facilityId)
				: undefined
			return this.telemedicineService.sendAbstract(input, staffProfileId)
		})
	}
}
