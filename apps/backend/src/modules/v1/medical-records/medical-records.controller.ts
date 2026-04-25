import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { MedicalRecordsService } from "./medical-records.service"

@Controller()
export class MedicalRecordsController {
	constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

	@RequirePermission("medical_records", "view")
	@Implement(v1.medicalRecords.listMedicalRecordsRequests)
	async listMedicalRecordsRequests() {
		return implement(v1.medicalRecords.listMedicalRecordsRequests).handler(async ({ input }) => {
			return this.medicalRecordsService.listMedicalRecordsRequests(input)
		})
	}

	@RequirePermission("medical_records", "view")
	@Implement(v1.medicalRecords.getMedicalRecordsRequest)
	async getMedicalRecordsRequest() {
		return implement(v1.medicalRecords.getMedicalRecordsRequest).handler(async ({ input }) => {
			return this.medicalRecordsService.getMedicalRecordsRequest(input.id)
		})
	}

	@RequirePermission("medical_records", "create")
	@Implement(v1.medicalRecords.createMedicalRecordsRequest)
	async createMedicalRecordsRequest() {
		return implement(v1.medicalRecords.createMedicalRecordsRequest).handler(async ({ input }) => {
			return this.medicalRecordsService.createMedicalRecordsRequest(input)
		})
	}

	@RequirePermission("medical_records", "edit")
	@Implement(v1.medicalRecords.updateMedicalRecordsRequest)
	async updateMedicalRecordsRequest() {
		return implement(v1.medicalRecords.updateMedicalRecordsRequest).handler(async ({ input }) => {
			return this.medicalRecordsService.updateMedicalRecordsRequest(input)
		})
	}

	// SLA-017: payment checkpoint
	@RequirePermission("medical_records", "edit")
	@Implement(v1.medicalRecords.markMedicalRecordsPaid)
	async markMedicalRecordsPaid() {
		return implement(v1.medicalRecords.markMedicalRecordsPaid).handler(async ({ input }) => {
			return this.medicalRecordsService.markMedicalRecordsPaid({
				id: input.id,
				paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
			})
		})
	}

	// SLA-020: release evidence checkpoint (Flow 7 Step 3)
	@RequirePermission("medical_records", "edit")
	@Implement(v1.medicalRecords.markMedicalRecordsReleased)
	async markMedicalRecordsReleased() {
		return implement(v1.medicalRecords.markMedicalRecordsReleased).handler(async ({ input }) => {
			return this.medicalRecordsService.markMedicalRecordsReleased({
				id: input.id,
				releasedByStaffId: input.releasedByStaffId,
				releasedAt: input.releasedAt ? new Date(input.releasedAt) : undefined,
			})
		})
	}
}
