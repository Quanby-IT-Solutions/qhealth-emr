import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission, RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { OfflineCacheService } from "./offline-cache.service"
import { SystemSettingsService } from "./system-settings.service"

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
@RequirePermission("admin", "view")
export class SystemSettingsController {
	constructor(
		private readonly systemSettingsService: SystemSettingsService,
		private readonly offlineCacheService: OfflineCacheService
	) {}

	@RequirePermissions([{ module: "system_settings", action: "view" }])
	@Implement(v1.systemSettings.get)
	async get(@Session() _session: UserSession, @Req() req: Request) {
		const facilityId = getActiveFacilityId(req)
		return implement(v1.systemSettings.get).handler(async () => {
			return this.systemSettingsService.get(facilityId)
		})
	}

	@RequirePermissions([{ module: "system_settings", action: "edit" }])
	@Implement(v1.systemSettings.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		const actor = {
			...extractActor(session, req),
			ipAddress: (req.ip ?? null) as string | null,
			userAgent: (req.get("user-agent") ?? null) as string | null,
		}
		const facilityId = actor.facilityId
		return implement(v1.systemSettings.update).handler(async ({ input }) => {
			return this.systemSettingsService.update(facilityId, input, actor)
		})
	}

	@RequirePermissions([{ module: "system_settings", action: "edit" }])
	@Implement(v1.systemSettings.triggerCacheJob)
	async triggerCacheJob(@Session() session: UserSession, @Req() req: Request) {
		const facilityId = getActiveFacilityId(req)
		const userId = session.user.id
		return implement(v1.systemSettings.triggerCacheJob).handler(async () => {
			return this.offlineCacheService.runJobForFacility(facilityId, `user:${userId}`)
		})
	}
}
