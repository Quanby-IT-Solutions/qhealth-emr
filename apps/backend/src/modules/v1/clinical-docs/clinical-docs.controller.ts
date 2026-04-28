import { Controller, Ip } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { ClinicalDocsService } from "./clinical-docs.service"

@Controller()
export class ClinicalDocsController {
	constructor(private readonly service: ClinicalDocsService) {}

	// ========================================================================
	// Note Templates
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.listTemplates)
	async listTemplates() {
		return implement(v1.clinicalDocs.listTemplates).handler(async ({ input }) => {
			return this.service.listTemplates(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.getTemplate)
	async getTemplate() {
		return implement(v1.clinicalDocs.getTemplate).handler(async ({ input }) => {
			return this.service.getTemplate(input.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.createTemplate)
	async createTemplate(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.createTemplate).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createTemplate(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.updateTemplate)
	async updateTemplate(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.updateTemplate).handler(async ({ input }) => {
			return this.service.updateTemplate(input)
		})
	}

	// ========================================================================
	// Clinical Notes
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.listNotes)
	async listNotes() {
		return implement(v1.clinicalDocs.listNotes).handler(async ({ input }) => {
			return this.service.listNotes(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.getNote)
	async getNote() {
		return implement(v1.clinicalDocs.getNote).handler(async ({ input }) => {
			return this.service.getNote(input.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.createNote)
	async createNote(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.createNote).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createNote(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.updateNote)
	async updateNote(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.updateNote).handler(async ({ input }) => {
			return this.service.updateNote(input)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.signNote)
	async signNote(@Session() session: UserSession, @Ip() ip: string) {
		return implement(v1.clinicalDocs.signNote).handler(async ({ input }) => {
			return this.service.signNote(input, ip ?? "unknown", session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.submitFpe)
	async submitFpe(@Session() session: UserSession, @Ip() ip: string) {
		return implement(v1.clinicalDocs.submitFpe).handler(async ({ input }) => {
			return this.service.submitFpe(input, session.user.id, ip ?? "unknown")
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.getNoteContext)
	async getNoteContext() {
		return implement(v1.clinicalDocs.getNoteContext).handler(async ({ input }) => {
			return this.service.getNoteContext(input)
		})
	}

	// ========================================================================
	// Note Addenda
	// ========================================================================

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.createAddendum)
	async createAddendum(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.createAddendum).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createAddendum(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.clinicalDocs.signAddendum)
	async signAddendum(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.signAddendum).handler(async ({ input }) => {
			return this.service.signAddendum(input, session.user.id)
		})
	}

	// ========================================================================
	// Consent Records
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.listConsents)
	async listConsents() {
		return implement(v1.clinicalDocs.listConsents).handler(async ({ input }) => {
			return this.service.listConsents(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.getConsent)
	async getConsent() {
		return implement(v1.clinicalDocs.getConsent).handler(async ({ input }) => {
			return this.service.getConsent(input.id)
		})
	}

	@RequirePermission("clinical_docs", "create")
	@Implement(v1.clinicalDocs.createConsent)
	async createConsent(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.createConsent).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createConsent(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "edit")
	@Implement(v1.clinicalDocs.revokeConsent)
	async revokeConsent(@Session() session: UserSession) {
		return implement(v1.clinicalDocs.revokeConsent).handler(async ({ input }) => {
			return this.service.revokeConsent(input)
		})
	}

	// ========================================================================
	// Cross-module: Signed Notes for CF4
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.getSignedNotes)
	async getSignedNotes() {
		return implement(v1.clinicalDocs.getSignedNotes).handler(async ({ input }) => {
			return this.service.getSignedNotes(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.clinicalDocs.extractCf4Data)
	async extractCf4Data() {
		return implement(v1.clinicalDocs.extractCf4Data).handler(async ({ input }) => {
			return this.service.extractCf4Data(input)
		})
	}
}
