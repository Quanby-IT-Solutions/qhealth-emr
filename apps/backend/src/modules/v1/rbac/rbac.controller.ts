import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { RbacService } from "./rbac.service"
import { RequirePermission } from "./rbac.guard"

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

	// ── User-Role Assignment ────────────────────────────────────────────

	@RequirePermission("admin", "edit")
	@Implement(v1.rbac.assignUserRoles)
	async assignUserRoles() {
		return implement(v1.rbac.assignUserRoles).handler(async ({ input }) => {
			return this.rbacService.assignUserRoles(input)
		})
	}

	// ── License Status ─────────────────────────────────────────────────

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
}
