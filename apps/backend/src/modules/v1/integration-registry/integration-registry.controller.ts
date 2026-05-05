import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

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

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "read" },
		{ module: "integration_registry", action: "view" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.integrationRegistry.list)
	async list(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.list).handler(async () => {
			return this.integrationRegistryService.list(facilityId, actor)
		})
	}

	// ── Get ───────────────────────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "read" },
		{ module: "integration_registry", action: "view" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.integrationRegistry.get)
	async get(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		const facilityId = getActiveFacilityId(req)
		return implement(v1.integrationRegistry.get).handler(async ({ input }) => {
			return this.integrationRegistryService.get(facilityId, input.id, actor)
		})
	}

	// ── Create ────────────────────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "write" },
		{ module: "integration_registry", action: "create" },
		{ module: "admin", action: "create" },
	])
	@Implement(v1.integrationRegistry.create)
	async create(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.create).handler(async ({ input }) => {
			return this.integrationRegistryService.create(actor.facilityId, input, actor)
		})
	}

	// ── Update ────────────────────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "write" },
		{ module: "integration_registry", action: "edit" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.integrationRegistry.update)
	async update(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.update).handler(async ({ input }) => {
			return this.integrationRegistryService.update(actor.facilityId, input, actor)
		})
	}

	// ── Delete ────────────────────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "write" },
		{ module: "integration_registry", action: "delete" },
		{ module: "admin", action: "delete" },
	])
	@Implement(v1.integrationRegistry.delete)
	async deleteIntegration(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.delete).handler(async ({ input }) => {
			return this.integrationRegistryService.delete(actor.facilityId, input.id, actor)
		})
	}

	// ── List credential refs ───────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "read" },
		{ module: "integration_registry", action: "view" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.integrationRegistry.listCredentialRefs)
	async listCredentialRefs(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.listCredentialRefs).handler(async () => {
			return this.integrationRegistryService.listCredentialRefs(actor)
		})
	}

	// ── Test connectivity ──────────────────────────────────────────────────────

	@RequireAnyPermissions([
		{ module: "admin.integrations", action: "write" },
		{ module: "integration_registry", action: "edit" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.integrationRegistry.testConnectivity)
	async testConnectivity(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.integrationRegistry.testConnectivity).handler(async ({ input }) => {
			return this.integrationRegistryService.testConnectivity(actor.facilityId, input.id, actor)
		})
	}

	// ── API Key Management (ADM-BE-12) ─────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.integrationRegistry.listApiKeys)
	async listApiKeys() {
		return implement(v1.integrationRegistry.listApiKeys).handler(async ({ input }) => {
			return this.integrationRegistryService.listApiKeys(input.integrationId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.integrationRegistry.generateApiKey)
	async generateApiKey(@Session() session: UserSession) {
		return implement(v1.integrationRegistry.generateApiKey).handler(async ({ input }) => {
			return this.integrationRegistryService.generateApiKey(
				input.integrationId,
				input.label,
				session.user.id
			)
		})
	}

	@RequirePermissions([{ module: "admin", action: "delete" }])
	@Implement(v1.integrationRegistry.revokeApiKey)
	async revokeApiKey(@Session() session: UserSession) {
		return implement(v1.integrationRegistry.revokeApiKey).handler(async ({ input }) => {
			return this.integrationRegistryService.revokeApiKey(input.id, session.user.id)
		})
	}

	@RequirePermissions([{ module: 'admin', action: 'edit' }])
	@Implement(v1.integrationRegistry.rotateApiKey)
	async rotateApiKey(@Session() session: UserSession) {
		return implement(v1.integrationRegistry.rotateApiKey).handler(async ({ input }) => {
			return this.integrationRegistryService.rotateApiKey(
				input.id,
				input.graceHours,
				session.user.id
			)
		})
	}

	// ── Webhook Endpoints (ADM-BE-12) ──────────────────────────────────────────

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.integrationRegistry.listWebhooks)
	async listWebhooks() {
		return implement(v1.integrationRegistry.listWebhooks).handler(async ({ input }) => {
			return this.integrationRegistryService.listWebhooks(input.integrationId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.integrationRegistry.createWebhook)
	async createWebhook() {
		return implement(v1.integrationRegistry.createWebhook).handler(async ({ input }) => {
			return this.integrationRegistryService.createWebhook(input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.integrationRegistry.updateWebhook)
	async updateWebhook() {
		return implement(v1.integrationRegistry.updateWebhook).handler(async ({ input }) => {
			return this.integrationRegistryService.updateWebhook(input.id, input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "delete" }])
	@Implement(v1.integrationRegistry.deleteWebhook)
	async deleteWebhook() {
		return implement(v1.integrationRegistry.deleteWebhook).handler(async ({ input }) => {
			return this.integrationRegistryService.deleteWebhook(input.id)
		})
	}
}
