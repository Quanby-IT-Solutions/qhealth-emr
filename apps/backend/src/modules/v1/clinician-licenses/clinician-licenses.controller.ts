import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { ClinicianLicensesService } from "./clinician-licenses.service"

@Controller()
export class ClinicianLicensesController {
	constructor(private readonly clinicianLicensesService: ClinicianLicensesService) {}

	@RequirePermissions([{ module: "admin", action: "view" }])
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

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.clinicianLicenses.get)
	async get() {
		return implement(v1.clinicianLicenses.get).handler(async ({ input }) => {
			return this.clinicianLicensesService.get(input.staffProfileId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
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

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.clinicianLicenses.verify)
	async verify() {
		return implement(v1.clinicianLicenses.verify).handler(async ({ input }) => {
			return this.clinicianLicensesService.verify({
				id: input.id,
				verificationProof: input.verificationProof,
			})
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.clinicianLicenses.markPending)
	async markPending() {
		return implement(v1.clinicianLicenses.markPending).handler(async ({ input }) => {
			return this.clinicianLicensesService.markPending(input.id)
		})
	}

	@RequirePermissions([{ module: "admin", action: "delete" }])
	@Implement(v1.clinicianLicenses.delete)
	async deleteLicense() {
		return implement(v1.clinicianLicenses.delete).handler(async ({ input }) => {
			return this.clinicianLicensesService.deleteLicense(input.id)
		})
	}
}
