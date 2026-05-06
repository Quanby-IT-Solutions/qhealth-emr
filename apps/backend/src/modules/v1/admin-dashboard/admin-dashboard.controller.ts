import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AdminDashboardService } from "./admin-dashboard.service"

type RbacProfile = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: {
		id: string
		permissions: Array<{ module: string; action: string }>
	} | null
}

function extractFacilityId(req: Request): string {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	const activeProfile =
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	return activeProfile?.facilityId ?? ""
}

function extractCanViewFhir(req: Request): boolean {
	const profile = (req as unknown as Record<string, unknown>).rbacProfile as RbacProfile | undefined
	return (
		profile?.activeRole?.permissions.some(p => p.module === "fhir" && p.action === "view") ?? false
	)
}

@Controller()
export class AdminDashboardController {
	constructor(private readonly adminDashboardService: AdminDashboardService) {}

	@RequirePermission("admin", "view")
	@Implement(v1.adminDashboard.summary)
	async summary(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.summary).handler(async () => {
			const facilityId = extractFacilityId(req)
			const canViewFhir = extractCanViewFhir(req)
			return this.adminDashboardService.getSummary(facilityId, { canViewFhir })
		})
	}

	@RequirePermission("medical_records", "view")
	@Implement(v1.adminDashboard.himOps)
	async himOps(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.himOps).handler(async () => {
			const facilityId = extractFacilityId(req)
			return this.adminDashboardService.getHimOps(facilityId)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.adminDashboard.exportCompliance)
	async exportCompliance(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.exportCompliance).handler(async ({ input }) => {
			const facilityId = extractFacilityId(req)
			return this.adminDashboardService.getExportCompliance(facilityId, input)
		})
	}

	@RequirePermission("civil_registry", "view")
	@Implement(v1.adminDashboard.civilRegistryOps)
	async civilRegistryOps(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.civilRegistryOps).handler(async () => {
			const facilityId = extractFacilityId(req)
			return this.adminDashboardService.getCivilRegistryOps(facilityId)
		})
	}

	@RequirePermission("formulary", "clinical_policy")
	@Implement(v1.adminDashboard.medicationCompliance)
	async medicationCompliance(@Session() _session: UserSession, @Req() req: Request) {
		return implement(v1.adminDashboard.medicationCompliance).handler(async () => {
			const facilityId = extractFacilityId(req)
			return this.adminDashboardService.getMedicationCompliance(facilityId)
		})
	}
}
