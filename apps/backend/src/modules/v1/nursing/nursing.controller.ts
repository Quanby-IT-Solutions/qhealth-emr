import { Controller } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { NursingService } from "./nursing.service"

@Controller()
export class NursingController {
	constructor(private readonly nursingService: NursingService) {}

	// ========================================================================
	// Vital Signs
	// ========================================================================

	@RequireAnyPermissions([
		{ module: "nursing", action: "view" },
		{ module: "surgical", action: "view" },
	])
	@Implement(v1.nursing.listVitals)
	async listVitals() {
		return implement(v1.nursing.listVitals).handler(async ({ input }) => {
			return this.nursingService.findVitals(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "nursing", action: "view" },
		{ module: "surgical", action: "view" },
	])
	@Implement(v1.nursing.getVital)
	async getVital() {
		return implement(v1.nursing.getVital).handler(async ({ input }) => {
			return this.nursingService.findVital(input.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createVital)
	async createVital(@Session() session: UserSession) {
		return implement(v1.nursing.createVital).handler(async ({ input }) => {
			return this.nursingService.createVital(input, session.user.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "nursing", action: "view" },
		{ module: "nursing", action: "create" },
	])
	@Implement(v1.nursing.getFaceScanStatus)
	async getFaceScanStatus() {
		return implement(v1.nursing.getFaceScanStatus).handler(async () => {
			return this.nursingService.getFaceScanStatus()
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createFaceScanToken)
	async createFaceScanToken() {
		return implement(v1.nursing.createFaceScanToken).handler(async ({ input }) => {
			return this.nursingService.createFaceScanToken(input)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createFaceScanPhoneSession)
	async createFaceScanPhoneSession(@Session() session: UserSession) {
		return implement(v1.nursing.createFaceScanPhoneSession).handler(async ({ input }) => {
			return this.nursingService.createFaceScanPhoneSession(input, session.user.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.getFaceScanPhoneSession)
	async getFaceScanPhoneSession(@Session() session: UserSession) {
		return implement(v1.nursing.getFaceScanPhoneSession).handler(async ({ input }) => {
			return this.nursingService.getFaceScanPhoneSession(input.id, session.user.id)
		})
	}

	@AllowAnonymous()
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@Implement(v1.nursing.getFaceScanPhoneSessionPreview)
	async getFaceScanPhoneSessionPreview() {
		return implement(v1.nursing.getFaceScanPhoneSessionPreview).handler(async ({ input }) => {
			return this.nursingService.getFaceScanPhoneSessionPreview(input)
		})
	}

	@AllowAnonymous()
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@Implement(v1.nursing.createFaceScanPhoneToken)
	async createFaceScanPhoneToken() {
		return implement(v1.nursing.createFaceScanPhoneToken).handler(async ({ input }) => {
			return this.nursingService.createFaceScanPhoneToken(input)
		})
	}

	@AllowAnonymous()
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@Implement(v1.nursing.completeFaceScanPhoneSession)
	async completeFaceScanPhoneSession() {
		return implement(v1.nursing.completeFaceScanPhoneSession).handler(async ({ input }) => {
			return this.nursingService.completeFaceScanPhoneSession(input)
		})
	}

	// ========================================================================
	// MAR Entries
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listMarEntries)
	async listMarEntries() {
		return implement(v1.nursing.listMarEntries).handler(async ({ input }) => {
			return this.nursingService.findMarEntries(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getMarEntry)
	async getMarEntry() {
		return implement(v1.nursing.getMarEntry).handler(async ({ input }) => {
			return this.nursingService.findMarEntry(input.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.administerMar)
	async administerMar(@Session() session: UserSession) {
		return implement(v1.nursing.administerMar).handler(async ({ input }) => {
			return this.nursingService.administerMar(input, session.user.id)
		})
	}

	// ========================================================================
	// TAR Entries
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listTarEntries)
	async listTarEntries() {
		return implement(v1.nursing.listTarEntries).handler(async ({ input }) => {
			return this.nursingService.findTarEntries(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getTarEntry)
	async getTarEntry() {
		return implement(v1.nursing.getTarEntry).handler(async ({ input }) => {
			return this.nursingService.findTarEntry(input.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createTarEntry)
	async createTarEntry(@Session() session: UserSession) {
		return implement(v1.nursing.createTarEntry).handler(async ({ input }) => {
			return this.nursingService.createTarEntry(input, session.user.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.administerTar)
	async administerTar(@Session() session: UserSession) {
		return implement(v1.nursing.administerTar).handler(async ({ input }) => {
			return this.nursingService.administerTar(input, session.user.id)
		})
	}

	// ========================================================================
	// I/O Entries
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listIoEntries)
	async listIoEntries() {
		return implement(v1.nursing.listIoEntries).handler(async ({ input }) => {
			return this.nursingService.findIoEntries(input)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createIoEntry)
	async createIoEntry(@Session() session: UserSession) {
		return implement(v1.nursing.createIoEntry).handler(async ({ input }) => {
			return this.nursingService.createIoEntry(input, session.user.id)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getIoBalance)
	async getIoBalance() {
		return implement(v1.nursing.getIoBalance).handler(async ({ input }) => {
			return this.nursingService.getIoBalance(input)
		})
	}

	// ========================================================================
	// Flowsheet Entries
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listFlowsheetEntries)
	async listFlowsheetEntries() {
		return implement(v1.nursing.listFlowsheetEntries).handler(async ({ input }) => {
			return this.nursingService.findFlowsheetEntries(input)
		})
	}

	// ========================================================================
	// Shift Handoffs
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listHandoffs)
	async listHandoffs() {
		return implement(v1.nursing.listHandoffs).handler(async ({ input }) => {
			return this.nursingService.findHandoffs(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getHandoff)
	async getHandoff() {
		return implement(v1.nursing.getHandoff).handler(async ({ input }) => {
			return this.nursingService.findHandoff(input.id)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.generateHandoffSummary)
	async generateHandoffSummary() {
		return implement(v1.nursing.generateHandoffSummary).handler(async ({ input }) => {
			return this.nursingService.generateHandoffSummary(input)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createHandoff)
	async createHandoff(@Session() session: UserSession) {
		return implement(v1.nursing.createHandoff).handler(async ({ input }) => {
			return this.nursingService.createHandoff(input, session.user.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.finalizeHandoff)
	async finalizeHandoff(@Session() session: UserSession) {
		return implement(v1.nursing.finalizeHandoff).handler(async ({ input }) => {
			return this.nursingService.finalizeHandoff(input, session.user.id)
		})
	}

	// ========================================================================
	// HAI Tags
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listHaiTags)
	async listHaiTags() {
		return implement(v1.nursing.listHaiTags).handler(async ({ input }) => {
			return this.nursingService.findHaiTags(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getHaiTag)
	async getHaiTag() {
		return implement(v1.nursing.getHaiTag).handler(async ({ input }) => {
			return this.nursingService.findHaiTag(input.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createHaiTag)
	async createHaiTag(@Session() session: UserSession) {
		return implement(v1.nursing.createHaiTag).handler(async ({ input }) => {
			return this.nursingService.createHaiTag(input, session.user.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.updateHaiTag)
	async updateHaiTag() {
		return implement(v1.nursing.updateHaiTag).handler(async ({ input }) => {
			return this.nursingService.updateHaiTag(input)
		})
	}

	// ========================================================================
	// Consent Records
	// ========================================================================

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.listConsents)
	async listConsents() {
		return implement(v1.nursing.listConsents).handler(async ({ input }) => {
			return this.nursingService.findConsentRecords(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.nursing.getConsent)
	async getConsent() {
		return implement(v1.nursing.getConsent).handler(async ({ input }) => {
			return this.nursingService.findConsentRecord(input.id)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.nursing.createConsent)
	async createConsent(@Session() session: UserSession) {
		return implement(v1.nursing.createConsent).handler(async ({ input }) => {
			return this.nursingService.createConsentRecord(input, session.user.id)
		})
	}
}
