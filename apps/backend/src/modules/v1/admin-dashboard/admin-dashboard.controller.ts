import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AdminDashboardService } from "./admin-dashboard.service"

type RbacProfile = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: { id: string } | null
}

function extractFacilityId(req: Request): string {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p =>
			p.roles.some(r => r.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	return activeProfile?.facilityId ?? ""
}

@Controller()
export class AdminDashboardController {
	constructor(private readonly adminDashboardService: AdminDashboardService) {}

	@RequirePermission("admin", "view")
	@Implement(v1.adminDashboard.summary)
	async summary(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.summary).handler(async () => {
			const facilityId = extractFacilityId(req)
			return this.adminDashboardService.getSummary(facilityId)
		})
	}
}
