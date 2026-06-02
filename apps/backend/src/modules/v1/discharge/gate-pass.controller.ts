import { Controller, NotFoundException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { eq } from "drizzle-orm"

import { staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { GatePassService } from "./gate-pass.service"

@Controller()
export class GatePassController {
	constructor(private readonly gatePassService: GatePassService) {}

	@RequirePermission("adt", "edit")
	@Implement(v1.discharge.issueGatePass)
	async issueGatePass(@Session() session: UserSession) {
		return implement(v1.discharge.issueGatePass).handler(async ({ input }) => {
			const staffId = await this.resolveStaffProfileId(session.user.id)
			const gatePass = await this.gatePassService.generateGatePass(input.encounterId, staffId)
			return {
				...gatePass,
				issuedAt: gatePass.issuedAt.toISOString(),
				admissionDatetime: gatePass.admissionDatetime.toISOString(),
				dischargeDatetime: gatePass.dischargeDatetime.toISOString(),
				createdAt: gatePass.createdAt.toISOString(),
			}
		})
	}

	private async resolveStaffProfileId(userId: string) {
		const [staffProfile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)

		if (!staffProfile) {
			throw new NotFoundException("Active staff profile not found for current user")
		}

		return staffProfile.id
	}

	@RequirePermission("adt", "view")
	@Implement(v1.discharge.getGatePass)
	async getGatePass() {
		return implement(v1.discharge.getGatePass).handler(async ({ input }) => {
			const gatePass = await this.gatePassService.getGatePass(input.encounterId)
			if (!gatePass) return null
			return {
				...gatePass,
				issuedAt: gatePass.issuedAt.toISOString(),
				admissionDatetime: gatePass.admissionDatetime.toISOString(),
				dischargeDatetime: gatePass.dischargeDatetime.toISOString(),
				createdAt: gatePass.createdAt.toISOString(),
			}
		})
	}
}
