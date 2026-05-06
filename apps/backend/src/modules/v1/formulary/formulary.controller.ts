import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission, RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { FormularyService, type FormularyActor } from "./formulary.service"

type RbacProfile = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: { id: string } | null
}

function extractActor(session: UserSession, req: Request): FormularyActor {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]

	const forwarded = req.headers["x-forwarded-for"] as string | undefined
	const ipAddress =
		forwarded?.split(",")[0]?.trim() ??
		(req.socket as { remoteAddress?: string } | undefined)?.remoteAddress ??
		null
	const userAgent = req.headers["user-agent"] ?? null

	return {
		userId: session.user.id,
		facilityId: activeProfile?.facilityId ?? "",
		staffProfileId: activeProfile?.id ?? null,
		ipAddress,
		userAgent,
	}
}

@Controller()
export class FormularyController {
	constructor(private readonly formularyService: FormularyService) {}

	// ========================================================================
	// Drug Generics
	// ========================================================================

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.drugGeneric.list)
	async listDrugGenerics() {
		return implement(v1.formulary.drugGeneric.list).handler(async ({ input }) => {
			return this.formularyService.findDrugGenerics(input)
		})
	}

	@RequirePermission("formulary", "manage_catalog")
	@Implement(v1.formulary.drugGeneric.create)
	async createDrugGeneric(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.drugGeneric.create).handler(async ({ input }) => {
			return this.formularyService.createDrugGeneric(input, actor)
		})
	}

	@RequirePermission("formulary", "manage_catalog")
	@Implement(v1.formulary.drugGeneric.update)
	async updateDrugGeneric(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.drugGeneric.update).handler(async ({ input }) => {
			return this.formularyService.updateDrugGeneric(input, actor)
		})
	}

	// ========================================================================
	// Drug Brands
	// ========================================================================

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.drugBrand.list)
	async listDrugBrands() {
		return implement(v1.formulary.drugBrand.list).handler(async ({ input }) => {
			return this.formularyService.findDrugBrands(input)
		})
	}

	@RequirePermission("formulary", "manage_catalog")
	@Implement(v1.formulary.drugBrand.create)
	async createDrugBrand(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.drugBrand.create).handler(async ({ input }) => {
			return this.formularyService.createDrugBrand(input, actor)
		})
	}

	@RequirePermission("formulary", "manage_catalog")
	@Implement(v1.formulary.drugBrand.update)
	async updateDrugBrand(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.drugBrand.update).handler(async ({ input }) => {
			return this.formularyService.updateDrugBrand(input, actor)
		})
	}

	// ========================================================================
	// Formulary Items
	// ========================================================================

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.item.list)
	async listFormularyItems() {
		return implement(v1.formulary.item.list).handler(async ({ input }) => {
			return this.formularyService.findFormularyItems(input)
		})
	}

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.item.get)
	async getFormularyItem() {
		return implement(v1.formulary.item.get).handler(async ({ input }) => {
			return this.formularyService.findFormularyItem(input.id)
		})
	}

	@RequirePermission("formulary", "edit")
	@Implement(v1.formulary.item.create)
	async createFormularyItem(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.item.create).handler(async ({ input }) => {
			return this.formularyService.createFormularyItem(input, actor)
		})
	}

	@RequirePermission("formulary", "edit")
	@Implement(v1.formulary.item.update)
	async updateFormularyItem(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.item.update).handler(async ({ input }) => {
			return this.formularyService.updateFormularyItem(input, actor)
		})
	}

	@RequirePermission("formulary", "clinical_policy")
	@Implement(v1.formulary.item.updateClinicalPolicy)
	async updateFormularyClinicalPolicy(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.item.updateClinicalPolicy).handler(async ({ input }) => {
			return this.formularyService.updateFormularyClinicalPolicy(input, actor)
		})
	}

	@RequirePermission("formulary", "edit")
	@Implement(v1.formulary.item.delete)
	async deleteFormularyItem(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.item.delete).handler(async ({ input }) => {
			return this.formularyService.deleteFormularyItem(input.id, actor)
		})
	}

	// ========================================================================
	// Clinical Code Sets (read-only search)
	// ========================================================================

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.icd10.search)
	async searchIcd10() {
		return implement(v1.formulary.icd10.search).handler(async ({ input }) => {
			return this.formularyService.searchIcd10(input)
		})
	}

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.loinc.search)
	async searchLoinc() {
		return implement(v1.formulary.loinc.search).handler(async ({ input }) => {
			return this.formularyService.searchLoinc(input)
		})
	}

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.rxnorm.search)
	async searchRxnorm() {
		return implement(v1.formulary.rxnorm.search).handler(async ({ input }) => {
			return this.formularyService.searchRxnorm(input)
		})
	}

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.rvs.search)
	async searchRvs() {
		return implement(v1.formulary.rvs.search).handler(async ({ input }) => {
			return this.formularyService.searchRvs(input)
		})
	}

	@RequirePermission("formulary", "view")
	@Implement(v1.formulary.snomedCt.search)
	async searchSnomedCt() {
		return implement(v1.formulary.snomedCt.search).handler(async ({ input }) => {
			return this.formularyService.searchSnomedCt(input)
		})
	}

	// ========================================================================
	// Code Set Admin — terminology governance (FORM-001)
	// ========================================================================

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "view" },
	])
	@Implement(v1.formulary.codeSetAdmin.listUploads)
	async listCatalogUploads() {
		return implement(v1.formulary.codeSetAdmin.listUploads).handler(async ({ input }) => {
			return this.formularyService.listCatalogUploads(input)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.recordUpload)
	async recordCatalogUpload(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.recordUpload).handler(async ({ input }) => {
			return this.formularyService.recordCatalogUpload(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.setCodeActive)
	async setCodeActive(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.setCodeActive).handler(async ({ input }) => {
			return this.formularyService.setCodeActive(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "view" },
	])
	@Implement(v1.formulary.codeSetAdmin.listDeprecations)
	async listDeprecations() {
		return implement(v1.formulary.codeSetAdmin.listDeprecations).handler(async ({ input }) => {
			return this.formularyService.listDeprecatedMappings(input)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.createDeprecation)
	async createDeprecation(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.createDeprecation).handler(async ({ input }) => {
			return this.formularyService.createDeprecatedMapping(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.updateDeprecation)
	async updateDeprecation(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.updateDeprecation).handler(async ({ input }) => {
			return this.formularyService.updateDeprecatedMapping(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.deleteDeprecation)
	async deleteDeprecation(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.deleteDeprecation).handler(async ({ input }) => {
			return this.formularyService.deleteDeprecatedMapping(input, actor)
		})
	}

	// ── Catalog Entry Editor (FORM-006) ──────────────────────────────────────

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.adminSearchEntries)
	async adminSearchEntries(@Session() _session: UserSession) {
		return implement(v1.formulary.codeSetAdmin.adminSearchEntries).handler(async ({ input }) => {
			return this.formularyService.adminSearchCatalogEntries(input)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.createEntry)
	async createEntry(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.createEntry).handler(async ({ input }) => {
			return this.formularyService.createCatalogEntry(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.updateEntry)
	async updateEntry(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.updateEntry).handler(async ({ input }) => {
			return this.formularyService.updateCatalogEntry(input, actor)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.deleteEntry)
	async deleteEntry(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.deleteEntry).handler(async ({ input }) => {
			return this.formularyService.deleteCatalogEntry(input, actor)
		})
	}

	// ── Catalog Versions (FORM-006) ───────────────────────────────────────────

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "view" },
	])
	@Implement(v1.formulary.codeSetAdmin.listVersions)
	async listVersions(@Session() _session: UserSession) {
		return implement(v1.formulary.codeSetAdmin.listVersions).handler(async ({ input }) => {
			return this.formularyService.listCatalogVersions(input)
		})
	}

	@RequirePermissions([
		{ module: "admin", action: "view" },
		{ module: "formulary", action: "terminology_admin" },
	])
	@Implement(v1.formulary.codeSetAdmin.publishVersion)
	async publishVersion(@Session() session: UserSession, @Req() req: Request) {
		const actor = extractActor(session, req)
		return implement(v1.formulary.codeSetAdmin.publishVersion).handler(async ({ input }) => {
			return this.formularyService.publishCatalogVersion(input, actor)
		})
	}
}
