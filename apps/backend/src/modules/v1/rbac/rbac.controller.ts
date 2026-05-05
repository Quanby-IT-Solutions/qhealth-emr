import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"

import { RequirePermission } from "./rbac.guard"
import { RbacService } from "./rbac.service"

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
		ipAddress: (req.headers["x-forwarded-for"] as string | undefined) ?? req.ip ?? null,
		userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
	}
}

@Controller()
export class RbacController {
	constructor(private readonly rbacService: RbacService) {}

	@Implement(v1.rbac.me)
	async me(@Session() session: UserSession) {
		return implement(v1.rbac.me).handler(async () => {
			return this.rbacService.getMyProfile(session.user.id)
		})
	}

	@Implement(v1.rbac.switchRole)
	async switchRole(@Session() session: UserSession) {
		return implement(v1.rbac.switchRole).handler(async ({ input }) => {
			return this.rbacService.switchRole(session.user.id, input.roleId)
		})
	}

	// ── Staff Management ──────────────────────────────────────────────

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.listStaff)
	async listStaff() {
		return implement(v1.rbac.listStaff).handler(async ({ input }) => {
			return this.rbacService.listStaff(input)
		})
	}

	@RequirePermission("admin", "create")
	@Implement(v1.rbac.createStaff)
	async createStaff() {
		return implement(v1.rbac.createStaff).handler(async ({ input }) => {
			return this.rbacService.createStaff(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.updateStaff)
	async updateStaff() {
		return implement(v1.rbac.updateStaff).handler(async ({ input }) => {
			return this.rbacService.updateStaff(input)
		})
	}

	@RequirePermission("admin", "delete")
	@Implement(v1.rbac.deactivateStaff)
	async deactivateStaff() {
		return implement(v1.rbac.deactivateStaff).handler(async ({ input }) => {
			return this.rbacService.deactivateStaff(input)
		})
	}

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.getStaffUser)
	async getStaffUser() {
		return implement(v1.rbac.getStaffUser).handler(async ({ input }) => {
			return this.rbacService.getStaffUser(input)
		})
	}

	// ── Role Management ────────────────────────────────────────────────

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.listRoles)
	async listRoles() {
		return implement(v1.rbac.listRoles).handler(async ({ input }) => {
			return this.rbacService.listRoles(input)
		})
	}

	@RequirePermission("admin", "create")
	@Implement(v1.rbac.createRole)
	async createRole() {
		return implement(v1.rbac.createRole).handler(async ({ input }) => {
			return this.rbacService.createRole(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.updateRole)
	async updateRole() {
		return implement(v1.rbac.updateRole).handler(async ({ input }) => {
			return this.rbacService.updateRole(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.updateRolePermissions)
	async updateRolePermissions() {
		return implement(v1.rbac.updateRolePermissions).handler(async ({ input }) => {
			return this.rbacService.updateRolePermissions(input)
		})
	}

	@RequirePermission("admin", "delete")
	@Implement(v1.rbac.archiveRole)
	async archiveRole() {
		return implement(v1.rbac.archiveRole).handler(async ({ input }) => {
			return this.rbacService.archiveRole(input.id)
		})
	}

	// ── User-Role Assignment ────────────────────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.assignUserRoles)
	async assignUserRoles() {
		return implement(v1.rbac.assignUserRoles).handler(async ({ input }) => {
			return this.rbacService.assignUserRoles(input)
		})
	}

	// ── License Status ─────────────────────────────────────────────────

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.getLicenseStatus)
	async getLicenseStatus() {
		return implement(v1.rbac.getLicenseStatus).handler(async ({ input }) => {
			return this.rbacService.getLicenseStatus(input)
		})
	}

	// ── Password Reset ──────────────────────────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.resetPassword)
	async resetPassword() {
		return implement(v1.rbac.resetPassword).handler(async ({ input }) => {
			return this.rbacService.resetPassword(input)
		})
	}

	// ── Access Governance — Multi-facility user creation ─────────────────

	@RequirePermission("admin", "create")
	@Implement(v1.rbac.createUser)
	async createUser(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.createUser).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.createUser(input, actor)
		})
	}

	// ── Access Governance — Re-enable user ───────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.reEnableUser)
	async reEnableUser(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.reEnableUser).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.reEnableUser(input, actor)
		})
	}

	// ── Access Governance — Facility membership ──────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.addStaffFacility)
	async addStaffFacility(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.addStaffFacility).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.addStaffFacility(input, actor)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.removeStaffFacility)
	async removeStaffFacility(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.removeStaffFacility).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.removeStaffFacility(input, actor)
		})
	}

	// ── Access Governance — Role assignment ─────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.addUserRole)
	async addUserRole(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.addUserRole).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.addUserRole(input, actor)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.removeUserRole)
	async removeUserRole(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.rbac.removeUserRole).handler(async ({ input }) => {
			const actor = extractActor(session, req)
			return this.rbacService.removeUserRole(input, actor)
		})
	}

	// ── Resend Activation ────────────────────────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.resendActivation)
	async resendActivation() {
		return implement(v1.rbac.resendActivation).handler(async ({ input }) => {
			return this.rbacService.resendActivation(input)
		})
	}

	// ── Get Single Role ──────────────────────────────────────────────────

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.getRole)
	async getRole() {
		return implement(v1.rbac.getRole).handler(async ({ input }) => {
			return this.rbacService.getRole(input)
		})
	}

	// ── List All Permissions ─────────────────────────────────────────────

	@RequirePermission("admin", "view")
	@Implement(v1.rbac.listPermissions)
	async listPermissions() {
		return implement(v1.rbac.listPermissions).handler(async () => {
			return this.rbacService.listPermissions()
		})
	}
}
