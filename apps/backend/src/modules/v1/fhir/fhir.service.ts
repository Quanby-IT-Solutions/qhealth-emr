import { Injectable, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import type {
	FhirExport,
	FhirExportsQuery,
	FhirExportsResponse,
	FhirValidationReport,
	NhdrSubmission,
	NhdrSubmissionsQuery,
	CreateFhirExport,
} from "@repo/contracts"

@Injectable()
export class FhirService {
	// ========================================================================
	// Exports
	// ========================================================================

	async listExports(query: FhirExportsQuery): Promise<FhirExportsResponse> {
		// Stub implementation - returns empty paginated response
		const page = query.page ?? 1
		const limit = query.limit ?? 20

		return {
			data: [],
			total: 0,
			page,
			totalPages: 0,
		}
	}

	async getExport(exportId: string): Promise<FhirExport> {
		// Stub implementation - throws not found
		throw new NotFoundException(`FHIR export with id ${exportId} not found`)
	}

	async createExport(
		input: CreateFhirExport,
		createdBy: string,
		createdByName: string
	): Promise<FhirExport> {
		// Stub implementation
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			facilityId: input.facilityId,
			status: "pending",
			dateRangeStart: input.dateRangeStart,
			dateRangeEnd: input.dateRangeEnd,
			resourceTypes: input.resourceTypes,
			validateOnExport: input.validateOnExport,
			totalResources: 0,
			exportedResources: 0,
			exportUrl: null,
			errorMessage: null,
			createdAt: now,
			completedAt: null,
			createdByName,
			nhdrSubmissionId: null,
		}
	}

	async getValidationReport(exportId: string): Promise<FhirValidationReport> {
		// Stub implementation
		return {
			exportId,
			validatedAt: new Date(),
			totalResources: 0,
			totalValid: 0,
			totalErrors: 0,
			totalWarnings: 0,
			isValid: true,
			resources: [],
		}
	}

	async submitToNhdr(
		exportId: string,
		submittedBy: string,
		submittedByName: string
	): Promise<NhdrSubmission> {
		// Stub implementation - would normally get export first
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			exportId,
			facilityId: crypto.randomUUID(), // Would come from export
			status: "pending",
			submittedAt: now,
			acknowledgementId: null,
			responseMessage: null,
			responseReceivedAt: null,
			submittedByName,
			periodStart: new Date().toISOString().split("T")[0]!,
			periodEnd: new Date().toISOString().split("T")[0]!,
		}
	}

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	async listNhdrSubmissions(query: NhdrSubmissionsQuery): Promise<NhdrSubmission[]> {
		// Stub implementation - returns empty array
		void query
		return []
	}
}
