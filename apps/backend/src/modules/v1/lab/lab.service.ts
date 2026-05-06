import { Injectable, NotFoundException } from "@nestjs/common"

import type {
	ApproveCrossMatch,
	BedsideVerifyInput,
	BedsideVerifyResult,
	CreateCrossMatch,
	CrossMatchListQuery,
	CrossMatchListResponse,
	CrossMatchRequest,
} from "@repo/contracts"

@Injectable()
export class LabService {
	// ========================================================================
	// Blood Bank — Cross-Match Requests
	// ========================================================================

	async listCrossMatches(query: CrossMatchListQuery): Promise<CrossMatchListResponse> {
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

	async getCrossMatch(id: string): Promise<CrossMatchRequest> {
		// Stub implementation - throws not found
		throw new NotFoundException(`Cross-match request with id ${id} not found`)
	}

	async createCrossMatch(
		input: CreateCrossMatch,
		requestedById: string
	): Promise<CrossMatchRequest> {
		// Stub implementation - returns mock cross-match request
		const now = new Date().toISOString()
		return {
			id: crypto.randomUUID(),
			facilityId: input.facilityId,
			patientId: input.patientId,
			patientName: "Mock Patient",
			bloodType: input.bloodType ?? null,
			componentType: input.componentType,
			unitsRequested: input.unitsRequested,
			urgency: input.urgency,
			clinicalIndication: input.clinicalIndication ?? null,
			compatibilityResult: null,
			status: "pending",
			requestedBy: requestedById,
			requestedAt: now,
			crossMatchedBy: null,
			crossMatchedAt: null,
			approvedBy: null,
			approvedAt: null,
			issuedBy: null,
			issuedAt: null,
			bloodUnits: [],
			createdAt: now,
		}
	}

	async approveCrossMatch(
		input: ApproveCrossMatch,
		approvedById: string
	): Promise<CrossMatchRequest> {
		// Stub implementation - throws not found
		void approvedById
		throw new NotFoundException(`Cross-match request with id ${input.id} not found`)
	}

	// ========================================================================
	// Blood Bank — Bedside Verification
	// ========================================================================

	async bedsideVerify(input: BedsideVerifyInput): Promise<BedsideVerifyResult> {
		// Stub implementation - returns mock verification result
		void input
		return {
			verified: false,
			patientMatch: false,
			unitMatch: false,
			message: "Verification system not yet implemented",
		}
	}
}
