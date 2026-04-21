import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { FeatureFlagsService } from "./feature-flags.service"

type RbacProfile = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: { id: string } | null
}

function extractActor(session: UserSession, req: Request) {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p =>
			p.roles.some(r => r.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]

	return {
		userId: session.user.id,
		facilityId: activeProfile?.facilityId ?? "",
		staffProfileId: activeProfile?.id ?? null,
		activeRoleId: profile?.activeRole?.id ?? null,
		activeFacilityId: activeProfile?.facilityId ?? "",
	}
}

@Controller()
export class FeatureFlagsController {
	constructor(private readonly featureFlagsService: FeatureFlagsService) {}

	// ── List ──────────────────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "view")
	@Implement(v1.featureFlags.list)
	async list(@Session() _session: UserSession) {
		return implement(v1.featureFlags.list).handler(async () => {
			return this.featureFlagsService.findAll()
		})
	}

	// ── Get detail ───────────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "view")
	@Implement(v1.featureFlags.get)
	async get(@Session() _session: UserSession) {
		return implement(v1.featureFlags.get).handler(async ({ input }) => {
			return this.featureFlagsService.findOne(input.id)
		})
	}

	// ── Create ────────────────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "create")
	@Implement(v1.featureFlags.create)
	async create(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.create).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.create(input, actor)
		})
	}

	// ── Update ────────────────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "edit")
	@Implement(v1.featureFlags.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.update).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.update(input, actor)
		})
	}

	// ── Delete ────────────────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "delete")
	@Implement(v1.featureFlags.delete)
	async delete(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.delete).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.delete(input.id, actor)
		})
	}

	// ── Update targeting ──────────────────────────────────────────────────────

	@RequirePermission("feature_flags", "edit")
	@Implement(v1.featureFlags.updateTargeting)
	async updateTargeting(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.updateTargeting).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.updateTargeting(input, actor)
		})
	}

	// ── Resolve for session ───────────────────────────────────────────────────

	@RequirePermission("feature_flags", "view")
	@Implement(v1.featureFlags.resolveForSession)
	async resolveForSession(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.resolveForSession).handler(async () => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.resolveForSession({
				activeFacilityId: actor.activeFacilityId,
				activeRoleId: actor.activeRoleId,
			})
		})
	}

	// ── Evaluate single flag ──────────────────────────────────────────────────

	@RequirePermission("feature_flags", "view")
	@Implement(v1.featureFlags.evaluate)
	async evaluate(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.featureFlags.evaluate).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.featureFlagsService.evaluateByKey(input.key, {
				activeFacilityId: actor.activeFacilityId,
				activeRoleId: actor.activeRoleId,
			})
		})
	}
}
