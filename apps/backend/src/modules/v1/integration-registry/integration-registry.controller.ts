import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

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

	const forwarded = req.headers["x-forwarded-for"] as string | undefined
	const ipAddress = forwarded?.split(",")[0]?.trim() ?? (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress ?? null
	const userAgent = req.headers["user-agent"] ?? null

	return {
		userId: session.user.id,
		facilityId: activeProfile?.facilityId ?? "",
		staffProfileId: activeProfile?.id ?? null,
		ipAddress,
		userAgent,
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

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "view" }])
	@Implement(v1.integrationRegistry.list)
	async list(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.list).handler(async () => {
			return this.integrationRegistryService.list(facilityId, actor)
		})
	}

	// ── Get ───────────────────────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "view" }])
	@Implement(v1.integrationRegistry.get)
	async get(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.get).handler(async ({ input }) => {
			return this.integrationRegistryService.get(facilityId, input.id, actor)
		})
	}

	// ── Create ────────────────────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "create" }])
	@Implement(v1.integrationRegistry.create)
	async create(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.create).handler(async ({ input }) => {
			return this.integrationRegistryService.create(actor.facilityId, input, actor)
		})
	}

	// ── Update ────────────────────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "edit" }])
	@Implement(v1.integrationRegistry.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.update).handler(async ({ input }) => {
			return this.integrationRegistryService.update(actor.facilityId, input, actor)
		})
	}

	// ── Delete ────────────────────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "delete" }])
	@Implement(v1.integrationRegistry.delete)
	async deleteIntegration(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.delete).handler(async ({ input }) => {
			return this.integrationRegistryService.delete(actor.facilityId, input.id, actor)
		})
	}

	// ── List credential refs ───────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "view" }])
	@Implement(v1.integrationRegistry.listCredentialRefs)
	async listCredentialRefs(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.listCredentialRefs).handler(async () => {
			return this.integrationRegistryService.listCredentialRefs(actor)
		})
	}

	// ── Test connectivity ──────────────────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "integration_registry", action: "edit" }])
	@Implement(v1.integrationRegistry.testConnectivity)
	async testConnectivity(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.testConnectivity).handler(async ({ input }) => {
			return this.integrationRegistryService.testConnectivity(actor.facilityId, input.id, actor)
		})
	}
}
