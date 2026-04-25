import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { SurgicalService } from "./surgical.service"

@Controller()
export class SurgicalController {
	constructor(private readonly surgicalService: SurgicalService) {}

	// ========================================================================
	// Surgical Cases
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.listCases)
	async listCases() {
		return implement(v1.surgical.listCases).handler(async ({ input }) => {
			return this.surgicalService.listCases(input)
		})
	}

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.getCase)
	async getCase() {
		return implement(v1.surgical.getCase).handler(async ({ input }) => {
			return this.surgicalService.getCase(input.id)
		})
	}

	@RequirePermission("surgical", "create")
	@Implement(v1.surgical.createCase)
	async createCase(@Session() session: UserSession) {
		return implement(v1.surgical.createCase).handler(async ({ input }) => {
			return this.surgicalService.createCase(input, session)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.updateCase)
	async updateCase(@Session() session: UserSession) {
		return implement(v1.surgical.updateCase).handler(async ({ input }) => {
			void session
			return this.surgicalService.updateCase(input)
		})
	}

	// ========================================================================
	// Operation Record
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.getOperationRecord)
	async getOperationRecord() {
		return implement(v1.surgical.getOperationRecord).handler(async ({ input }) => {
			return this.surgicalService.getOperationRecord(input.caseId)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.saveOperationRecord)
	async saveOperationRecord(@Session() session: UserSession) {
		return implement(v1.surgical.saveOperationRecord).handler(async ({ input }) => {
			return this.surgicalService.saveOperationRecord(input, session)
		})
	}

	// ========================================================================
	// Anesthesia Record
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.getAnesthesiaRecord)
	async getAnesthesiaRecord() {
		return implement(v1.surgical.getAnesthesiaRecord).handler(async ({ input }) => {
			return this.surgicalService.getAnesthesiaRecord(input.caseId)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.saveAnesthesiaRecord)
	async saveAnesthesiaRecord(@Session() session: UserSession) {
		return implement(v1.surgical.saveAnesthesiaRecord).handler(async ({ input }) => {
			return this.surgicalService.saveAnesthesiaRecord(input, session)
		})
	}

	// ========================================================================
	// Pre-Op Checklist
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.getPreOpChecklist)
	async getPreOpChecklist() {
		return implement(v1.surgical.getPreOpChecklist).handler(async ({ input }) => {
			return this.surgicalService.getPreOpChecklist(input.caseId)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.savePreOpChecklist)
	async savePreOpChecklist(@Session() session: UserSession) {
		return implement(v1.surgical.savePreOpChecklist).handler(async ({ input }) => {
			return this.surgicalService.savePreOpChecklist(input, session)
		})
	}

	// ========================================================================
	// RVS Codes
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.searchRvsCodes)
	async searchRvsCodes() {
		return implement(v1.surgical.searchRvsCodes).handler(async ({ input }) => {
			return this.surgicalService.searchRvsCodes(input)
		})
	}

	// ========================================================================
	// RVS Assignments
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.listRvsAssignments)
	async listRvsAssignments() {
		return implement(v1.surgical.listRvsAssignments).handler(async ({ input }) => {
			return this.surgicalService.listRvsAssignments(input.caseId)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.suggestRvsCode)
	async suggestRvsCode(@Session() session: UserSession) {
		return implement(v1.surgical.suggestRvsCode).handler(async ({ input }) => {
			return this.surgicalService.suggestRvsCode(input, session)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.updateRvsStatus)
	async updateRvsStatus(@Session() session: UserSession) {
		return implement(v1.surgical.updateRvsStatus).handler(async ({ input }) => {
			return this.surgicalService.updateRvsStatus(input, session)
		})
	}

	@RequirePermission("surgical", "edit")
	@Implement(v1.surgical.removeRvsAssignment)
	async removeRvsAssignment(@Session() session: UserSession) {
		return implement(v1.surgical.removeRvsAssignment).handler(async ({ input }) => {
			void session
			return this.surgicalService.removeRvsAssignment(input)
		})
	}

	// ========================================================================
	// OR Slots
	// ========================================================================

	@RequirePermission("surgical", "view")
	@Implement(v1.surgical.listOrSlots)
	async listOrSlots() {
		return implement(v1.surgical.listOrSlots).handler(async ({ input }) => {
			return this.surgicalService.listOrSlots(input)
		})
	}
}
