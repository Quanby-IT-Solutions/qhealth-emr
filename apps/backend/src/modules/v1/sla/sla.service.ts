import { Injectable, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import type {
	SlaEventsQuery,
	SlaEventsResponse,
	SlaConfigsQuery,
	SlaConfigsResponse,
	CreateSlaConfig,
	UpdateSlaConfig,
	SlaComplianceQuery,
	SlaComplianceReport,
	SlaConfig,
	SlaEvent,
} from "@repo/contracts"

@Injectable()
export class SlaService {
	// ========================================================================
	// SLA Events
	// ========================================================================

	async listEvents(query: SlaEventsQuery): Promise<SlaEventsResponse> {
		// Stub implementation - returns empty paginated response
		const page = query.page ?? 1
		const limit = query.limit ?? 50

		return {
			data: [],
			total: 0,
			page,
			limit,
			totalPages: 0,
		}
	}

	async getEventsByEncounter(encounterId: string): Promise<SlaEvent[]> {
		// Stub implementation - returns empty array
		void encounterId
		return []
	}

	// ========================================================================
	// SLA Configs
	// ========================================================================

	async listConfigs(query: SlaConfigsQuery): Promise<SlaConfigsResponse> {
		// Stub implementation - returns empty array
		void query
		return {
			data: [],
		}
	}

	async createConfig(input: CreateSlaConfig): Promise<SlaConfig> {
		// Stub implementation - returns mock config
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			facilityId: input.facilityId,
			workflowType: input.workflowType,
			targetMinutes: input.targetMinutes,
			warningThresholdPct: input.warningThresholdPct,
			isActive: true,
			description: input.description,
			createdAt: now,
			updatedAt: now,
		}
	}

	async updateConfig(input: UpdateSlaConfig): Promise<SlaConfig> {
		// Stub implementation - throws not found for now
		throw new NotFoundException(`SLA config with id ${input.id} not found`)
	}

	async deleteConfig(id: string): Promise<{ success: boolean }> {
		// Stub implementation
		void id
		return { success: true }
	}

	// ========================================================================
	// SLA Compliance Report
	// ========================================================================

	async getComplianceReport(query: SlaComplianceQuery): Promise<SlaComplianceReport> {
		// Stub implementation - returns empty compliance report
		return {
			facilityId: query.facilityId,
			periodStart: query.periodStart,
			periodEnd: query.periodEnd,
			overallCompliancePct: 0,
			metrics: [],
		}
	}
}
