import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { FacilityProfileService } from "./facility-profile.service"

type RbacProfile = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: { id: string } | null
}

function extractActor(session: UserSession, req: Request) {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]

	return {
		userId: session.user.id,
		facilityId: activeProfile?.facilityId ?? "",
		staffProfileId: activeProfile?.id ?? null,
		ipAddress: (req.ip ?? null) as string | null,
		userAgent: (req.get("user-agent") ?? null) as string | null,
	}
}

function getActiveFacilityId(req: Request): string {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]

	return activeProfile?.facilityId ?? ""
}

@Controller()
export class FacilityProfileController {
	constructor(private readonly facilityProfileService: FacilityProfileService) {}

	@RequirePermission("facility_profile", "view")
	@Implement(v1.facilityProfile.get)
	async get(@Session() _session: UserSession, @Req() req: Request) {
		const facilityId = getActiveFacilityId(req)
		return implement(v1.facilityProfile.get).handler(async () => {
			return this.facilityProfileService.get(facilityId)
		})
	}

	@RequirePermission("facility_profile", "edit")
	@Implement(v1.facilityProfile.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		const facilityId = actor.facilityId
		return implement(v1.facilityProfile.update).handler(async ({ input }) => {
			return this.facilityProfileService.update(facilityId, input, actor)
		})
	}
}
