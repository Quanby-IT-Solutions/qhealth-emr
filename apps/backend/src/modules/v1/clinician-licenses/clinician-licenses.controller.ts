import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { ClinicianLicensesService } from "./clinician-licenses.service"

@Controller()
export class ClinicianLicensesController {
	constructor(private readonly clinicianLicensesService: ClinicianLicensesService) {}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.clinicianLicenses.list)
	async list() {
		return implement(v1.clinicianLicenses.list).handler(async ({ input }) => {
			return this.clinicianLicensesService.list({
				facilityId: input.facilityId,
				search: input.search,
				status: input.status,
				page: input.page ?? 1,
				limit: input.limit ?? 20,
			})
		})
	}

	@Implement(v1.clinicianLicenses.getMine)
	async getMine(@Session() session: UserSession) {
		return implement(v1.clinicianLicenses.getMine).handler(async () => {
			return this.clinicianLicensesService.getMine(session.user.id)
		})
	}

	// Keep /me above /{staffProfileId}; Nest matches overlapping GET routes in declaration order.
	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.clinicianLicenses.get)
	async get() {
		return implement(v1.clinicianLicenses.get).handler(async ({ input }) => {
			return this.clinicianLicensesService.get(input.staffProfileId)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.clinicianLicenses.add)
	async add() {
		return implement(v1.clinicianLicenses.add).handler(async ({ input }) => {
			return this.clinicianLicensesService.add({
				staffProfileId: input.staffProfileId,
				licenseType: input.licenseType,
				licenseNumber: input.licenseNumber,
				issueDate: input.issueDate,
				expiryDate: input.expiryDate,
				documentUri: input.documentUri,
			})
		})
	}

	@Implement(v1.clinicianLicenses.addMine)
	async addMine(@Session() session: UserSession) {
		return implement(v1.clinicianLicenses.addMine).handler(async ({ input }) => {
			return this.clinicianLicensesService.addMine(session.user.id, input)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.clinicianLicenses.update)
	async update() {
		return implement(v1.clinicianLicenses.update).handler(async ({ input }) => {
			return this.clinicianLicensesService.update({
				id: input.id,
				licenseNumber: input.licenseNumber,
				issueDate: input.issueDate,
				expiryDate: input.expiryDate,
				documentUri: input.documentUri,
			})
		})
	}

	@Implement(v1.clinicianLicenses.updateMine)
	async updateMine(@Session() session: UserSession) {
		return implement(v1.clinicianLicenses.updateMine).handler(async ({ input }) => {
			return this.clinicianLicensesService.updateMine(session.user.id, {
				id: input.id,
				licenseNumber: input.licenseNumber,
				issueDate: input.issueDate,
				expiryDate: input.expiryDate,
				documentUri: input.documentUri,
			})
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.clinicianLicenses.verify)
	async verify() {
		return implement(v1.clinicianLicenses.verify).handler(async ({ input }) => {
			return this.clinicianLicensesService.verify({
				id: input.id,
				verificationProof: input.verificationProof,
			})
		})
	}

	@Implement(v1.clinicianLicenses.verifyMine)
	async verifyMine(@Session() session: UserSession) {
		return implement(v1.clinicianLicenses.verifyMine).handler(async ({ input }) => {
			return this.clinicianLicensesService.verifyMine(session.user.id, {
				id: input.id,
				verificationProof: input.verificationProof,
			})
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.clinicianLicenses.markPending)
	async markPending() {
		return implement(v1.clinicianLicenses.markPending).handler(async ({ input }) => {
			return this.clinicianLicensesService.markPending(input.id)
		})
	}

	@Implement(v1.clinicianLicenses.deleteMine)
	async deleteMine(@Session() session: UserSession) {
		return implement(v1.clinicianLicenses.deleteMine).handler(async ({ input }) => {
			return this.clinicianLicensesService.deleteMine(session.user.id, input.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.licenses", action: "write" },
		{ module: "admin", action: "delete" },
	])
	@Implement(v1.clinicianLicenses.delete)
	async deleteLicense() {
		return implement(v1.clinicianLicenses.delete).handler(async ({ input }) => {
			return this.clinicianLicensesService.deleteLicense(input.id)
		})
	}
}
