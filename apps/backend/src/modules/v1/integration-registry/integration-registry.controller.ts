import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { IntegrationRegistryService } from "./integration-registry.service"

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
	}
}

function getActiveFacilityId(req: Request): string {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p =>
			p.roles.some(r => r.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]

	return activeProfile?.facilityId ?? ""
}

@Controller()
export class IntegrationRegistryController {
	constructor(private readonly integrationRegistryService: IntegrationRegistryService) {}

	// ── List ──────────────────────────────────────────────────────────────────

	@RequirePermission("integration_registry", "view")
	@Implement(v1.integrationRegistry.list)
	async list(@Session() _session: UserSession, @Req() req: Request) {
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.list).handler(async () => {
			return this.integrationRegistryService.list(facilityId)
		})
	}

	// ── Get ───────────────────────────────────────────────────────────────────

	@RequirePermission("integration_registry", "view")
	@Implement(v1.integrationRegistry.get)
	async get(@Session() _session: UserSession, @Req() req: Request) {
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.get).handler(async ({ input }) => {
			return this.integrationRegistryService.get(facilityId, input.id)
		})
	}

	// ── Create ────────────────────────────────────────────────────────────────

	@RequirePermission("integration_registry", "create")
	@Implement(v1.integrationRegistry.create)
	async create(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.create).handler(async ({ input }) => {
			return this.integrationRegistryService.create(actor.facilityId, input, actor)
		})
	}

	// ── Update ────────────────────────────────────────────────────────────────

	@RequirePermission("integration_registry", "edit")
	@Implement(v1.integrationRegistry.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.update).handler(async ({ input }) => {
			return this.integrationRegistryService.update(actor.facilityId, input, actor)
		})
	}

	// ── Delete ────────────────────────────────────────────────────────────────

	@RequirePermission("integration_registry", "delete")
	@Implement(v1.integrationRegistry.delete)
	async deleteIntegration(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.delete).handler(async ({ input }) => {
			return this.integrationRegistryService.delete(actor.facilityId, input.id, actor)
		})
	}

	// ── List credential refs ───────────────────────────────────────────────────

	@RequirePermission("integration_registry", "view")
	@Implement(v1.integrationRegistry.listCredentialRefs)
	async listCredentialRefs(@Session() _session: UserSession) {
		return implement(v1.integrationRegistry.listCredentialRefs).handler(async () => {
			return this.integrationRegistryService.listCredentialRefs()
		})
	}
}
