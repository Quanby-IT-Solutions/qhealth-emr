import { Controller, NotFoundException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { and, eq } from "drizzle-orm"

import { staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { OpdTriageService } from "./opd-triage.service"

@Controller()
export class OpdTriageController {
	constructor(private readonly opdTriageService: OpdTriageService) {}

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

	// Triage Officers (nursing:create) record walk-in intakes
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.create)
	async create() {
		return implement(v1.opdTriage.create).handler(async ({ input }) => {
			return this.opdTriageService.create(input)
		})
	}

	// Any clinical staff with patient-record access can look up a triage record
	@RequirePermission("patients", "view")
	@Implement(v1.opdTriage.get)
	async get() {
		return implement(v1.opdTriage.get).handler(async ({ input }) => {
			return this.opdTriageService.findById(input)
		})
	}

	// Registrar (opd:view) uses the pending queue for reconciliation
	@RequirePermission("opd", "view")
	@Implement(v1.opdTriage.listPending)
	async listPending() {
		return implement(v1.opdTriage.listPending).handler(async ({ input }) => {
			return this.opdTriageService.listPending(input)
		})
	}

	// Registrar (adt:edit) links a walk-in intake to a registered patient
	@RequirePermission("adt", "edit")
	@Implement(v1.opdTriage.linkToPatient)
	async linkToPatient() {
		return implement(v1.opdTriage.linkToPatient).handler(async ({ input }) => {
			return this.opdTriageService.linkToPatient(input)
		})
	}

	// Triage Officers queue OPD patients assessed before arrival
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.createRemoteIntake)
	async createRemoteIntake(@Session() session: UserSession) {
		return implement(v1.opdTriage.createRemoteIntake).handler(async ({ input }) => {
			const staffProfileId = await this.resolveStaffProfileId(session.user.id, input.facilityId)
			return this.opdTriageService.createRemoteIntake({
				...input,
				triageStaffId: staffProfileId,
			})
		})
	}

	// Triage/OPD staff monitor pending remote arrivals
	@RequirePermission("opd", "view")
	@Implement(v1.opdTriage.listRemoteIntakes)
	async listRemoteIntakes() {
		return implement(v1.opdTriage.listRemoteIntakes).handler(async ({ input }) => {
			return this.opdTriageService.listRemoteIntakes(input)
		})
	}

	// Triage Officers convert a remote intake into a normal OPD triage intake on arrival
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.markRemoteArrived)
	async markRemoteArrived() {
		return implement(v1.opdTriage.markRemoteArrived).handler(async ({ input }) => {
			return this.opdTriageService.markRemoteArrived(input)
		})
	}

	// Triage Officers can cancel or no-show pending remote intakes
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.cancelRemoteIntake)
	async cancelRemoteIntake() {
		return implement(v1.opdTriage.cancelRemoteIntake).handler(async ({ input }) => {
			return this.opdTriageService.cancelRemoteIntake(input)
		})
	}

	// Triage Officers can join the LiveKit room for video remote intakes
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.joinRemoteLiveKitRoom)
	async joinRemoteLiveKitRoom(@Session() session: UserSession) {
		return implement(v1.opdTriage.joinRemoteLiveKitRoom).handler(async ({ input }) => {
			const intake = await this.opdTriageService.findRemoteIntakeFacility(input.id)
			const staffProfileId = await this.resolveStaffProfileId(session.user.id, intake.facilityId)
			return this.opdTriageService.joinRemoteLiveKitRoom(input, staffProfileId)
		})
	}

	// Triage Officers can mark a LiveKit room ended after disconnecting
	@RequirePermission("nursing", "create")
	@Implement(v1.opdTriage.endRemoteLiveKitSession)
	async endRemoteLiveKitSession(@Session() session: UserSession) {
		return implement(v1.opdTriage.endRemoteLiveKitSession).handler(async ({ input }) => {
			const intake = await this.opdTriageService.findRemoteIntakeFacility(input.id)
			const staffProfileId = await this.resolveStaffProfileId(session.user.id, intake.facilityId)
			return this.opdTriageService.endRemoteLiveKitSession(input, staffProfileId)
		})
	}
}
