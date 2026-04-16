import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { UserSession } from "@thallesp/nestjs-better-auth"

import type { V1Inputs } from "@/config/contract-types"

type ListCasesInput = V1Inputs["surgical"]["listCases"]
type CreateCaseInput = V1Inputs["surgical"]["createCase"]
type UpdateCaseInput = V1Inputs["surgical"]["updateCase"]
type SaveOperationRecordInput = V1Inputs["surgical"]["saveOperationRecord"]
type SaveAnesthesiaRecordInput = V1Inputs["surgical"]["saveAnesthesiaRecord"]
type SavePreOpChecklistInput = V1Inputs["surgical"]["savePreOpChecklist"]
type SearchRvsCodesInput = V1Inputs["surgical"]["searchRvsCodes"]
type SuggestRvsCodeInput = V1Inputs["surgical"]["suggestRvsCode"]
type UpdateRvsStatusInput = V1Inputs["surgical"]["updateRvsStatus"]
type RemoveRvsAssignmentInput = V1Inputs["surgical"]["removeRvsAssignment"]
type OrSlotsInput = V1Inputs["surgical"]["listOrSlots"]

@Injectable()
export class SurgicalService {
	private readonly logger = new Logger(SurgicalService.name)

	// ========================================================================
	// Surgical Cases
	// ========================================================================

	async listCases(input: ListCasesInput) {
		this.logger.debug(`Listing surgical cases with filters: ${JSON.stringify(input)}`)

		// TODO: Implement with actual database query
		// For now, return empty paginated response
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 25

		return {
			data: [],
			total: 0,
			page,
			limit,
			totalPages: 0,
		}
	}

	async getCase(id: string) {
		this.logger.debug(`Getting surgical case: ${id}`)

		// TODO: Implement with actual database query
		// For now, return a stub to prevent frontend errors
		const now = new Date()
		return {
			id,
			facilityId: "",
			encounterId: null,
			patientId: "",
			patientName: null,
			procedureName: "",
			orSuite: null,
			surgeonName: null,
			surgeonStaffId: null,
			anesthesiologistName: null,
			anesthesiologistStaffId: null,
			scheduledDatetime: null,
			actualStartDatetime: null,
			actualEndDatetime: null,
			status: "scheduled" as const,
			surgicalType: "",
			asaClass: null,
			notes: null,
			createdAt: now,
			updatedAt: now,
		}
	}

	async createCase(input: CreateCaseInput, session: UserSession) {
		this.logger.log(`Creating surgical case for patient ${input.patientId}`)
		void session

		// TODO: Implement with actual database insert
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			facilityId: input.facilityId,
			encounterId: input.encounterId ?? null,
			patientId: input.patientId,
			patientName: null,
			procedureName: input.procedureName,
			orSuite: input.orSuite ?? null,
			surgeonName: null,
			surgeonStaffId: input.surgeonStaffId ?? null,
			anesthesiologistName: null,
			anesthesiologistStaffId: input.anesthesiologistStaffId ?? null,
			scheduledDatetime: input.scheduledDatetime ?? null,
			actualStartDatetime: null,
			actualEndDatetime: null,
			status: "scheduled" as const,
			surgicalType: input.surgicalType,
			asaClass: input.asaClass ?? null,
			notes: input.notes ?? null,
			createdAt: now,
			updatedAt: now,
		}
	}

	async updateCase(input: UpdateCaseInput) {
		this.logger.log(`Updating surgical case: ${input.id}`)

		// TODO: Implement with actual database update
		// For now, return a stub
		const now = new Date()
		return {
			id: input.id,
			facilityId: "",
			encounterId: null,
			patientId: "",
			patientName: null,
			procedureName: "",
			orSuite: input.orSuite ?? null,
			surgeonName: null,
			surgeonStaffId: null,
			anesthesiologistName: null,
			anesthesiologistStaffId: null,
			scheduledDatetime: null,
			actualStartDatetime: input.actualStartDatetime ?? null,
			actualEndDatetime: input.actualEndDatetime ?? null,
			status: input.status ?? ("scheduled" as const),
			surgicalType: "",
			asaClass: input.asaClass ?? null,
			notes: input.notes ?? null,
			createdAt: now,
			updatedAt: now,
		}
	}

	// ========================================================================
	// Operation Record
	// ========================================================================

	async getOperationRecord(caseId: string) {
		this.logger.debug(`Getting operation record for case: ${caseId}`)

		// TODO: Implement with actual database query
		return null
	}

	async saveOperationRecord(input: SaveOperationRecordInput, session: UserSession) {
		this.logger.log(`Saving operation record for case: ${input.caseId}`)
		void session

		// TODO: Implement with actual database upsert
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			surgicalCaseId: input.caseId,
			preOpDiagnosis: input.preOpDiagnosis,
			postOpDiagnosis: input.postOpDiagnosis ?? null,
			procedurePerformed: input.procedurePerformed,
			operativeTechnique: input.operativeTechnique ?? null,
			findings: input.findings ?? null,
			specimens: input.specimens ?? null,
			estimatedBloodLoss: input.estimatedBloodLoss ?? null,
			fluidIn: input.fluidIn ?? null,
			fluidOut: input.fluidOut ?? null,
			incisionDatetime: input.incisionDatetime ?? null,
			closureDatetime: input.closureDatetime ?? null,
			surgeonStaffId: input.surgeonStaffId,
			firstAssistantStaffId: input.firstAssistantStaffId ?? null,
			secondAssistantStaffId: input.secondAssistantStaffId ?? null,
			scrubNurseStaffId: input.scrubNurseStaffId ?? null,
			circulatingNurseStaffId: input.circulatingNurseStaffId ?? null,
			instrumentCountCorrect: input.instrumentCountCorrect,
			swabCountCorrect: input.swabCountCorrect,
			complications: input.complications ?? null,
			createdAt: now,
			updatedAt: now,
		}
	}

	// ========================================================================
	// Anesthesia Record
	// ========================================================================

	async getAnesthesiaRecord(caseId: string) {
		this.logger.debug(`Getting anesthesia record for case: ${caseId}`)

		// TODO: Implement with actual database query
		return null
	}

	async saveAnesthesiaRecord(input: SaveAnesthesiaRecordInput, session: UserSession) {
		this.logger.log(`Saving anesthesia record for case: ${input.caseId}`)
		void session

		// TODO: Implement with actual database upsert
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			surgicalCaseId: input.caseId,
			asaClass: input.asaClass,
			airwayType: input.airwayType,
			intubationAttempts: input.intubationAttempts,
			agents: input.agents,
			intraopVitals: input.intraopVitals,
			reversalAgent: input.reversalAgent ?? null,
			totalAnesthesiaMinutes: input.totalAnesthesiaMinutes ?? null,
			emergenceSmooth: input.emergenceSmooth,
			complications: input.complications ?? null,
			postAnesthesiaCareNotes: input.postAnesthesiaCareNotes ?? null,
			createdAt: now,
			updatedAt: now,
		}
	}

	// ========================================================================
	// Pre-Op Checklist
	// ========================================================================

	async getPreOpChecklist(caseId: string) {
		this.logger.debug(`Getting pre-op checklist for case: ${caseId}`)

		// TODO: Implement with actual database query
		return null
	}

	async savePreOpChecklist(input: SavePreOpChecklistInput, session: UserSession) {
		this.logger.log(`Saving pre-op checklist for case: ${input.caseId}`)
		void session

		// TODO: Implement with actual database upsert
		const now = new Date()
		const items = input.items.map(item => ({
			key: item.key,
			label: item.key, // Label would come from a predefined list
			checked: item.checked,
			checkedAt: item.checked ? now.toISOString() : null,
			checkedByName: null,
		}))

		return {
			id: crypto.randomUUID(),
			surgicalCaseId: input.caseId,
			items,
			allClear: items.every(item => item.checked),
			completedAt: items.every(item => item.checked) ? now.toISOString() : null,
			completedByName: null,
			createdAt: now,
			updatedAt: now,
		}
	}

	// ========================================================================
	// RVS Codes
	// ========================================================================

	async searchRvsCodes(input: SearchRvsCodesInput) {
		this.logger.debug(`Searching RVS codes: ${input.search}`)

		// TODO: Implement with actual database query against rvsCodes table
		return {
			data: [],
			total: 0,
			page: 1,
			limit: Number(input.limit ?? 20),
			totalPages: 0,
		}
	}

	// ========================================================================
	// RVS Assignments
	// ========================================================================

	async listRvsAssignments(caseId: string) {
		this.logger.debug(`Listing RVS assignments for case: ${caseId}`)

		// TODO: Implement with actual database query
		return []
	}

	async suggestRvsCode(input: SuggestRvsCodeInput, session: UserSession) {
		this.logger.log(`Suggesting RVS code for case: ${input.caseId}`)
		void session

		// TODO: Implement with actual database insert
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			surgicalCaseId: input.caseId,
			rvsCodeId: input.rvsCodeId,
			code: "", // Would be fetched from rvsCodes table
			description: "",
			status: "suggested" as const,
			suggestedByName: null,
			validatedByName: null,
			finalizedByName: null,
			suggestedAt: now.toISOString(),
			validatedAt: null,
			finalizedAt: null,
			modifier: input.modifier ?? null,
			units: input.units ?? 1,
			createdAt: now,
		}
	}

	async updateRvsStatus(input: UpdateRvsStatusInput, session: UserSession) {
		this.logger.log(`Updating RVS status: ${input.assignmentId} -> ${input.status}`)
		void session

		// TODO: Implement with actual database update
		// For now, return a stub
		const now = new Date()
		return {
			id: input.assignmentId,
			surgicalCaseId: "",
			rvsCodeId: "",
			code: "",
			description: "",
			status: input.status,
			suggestedByName: null,
			validatedByName: null,
			finalizedByName: null,
			suggestedAt: now.toISOString(),
			validatedAt: input.status === "validated" ? now.toISOString() : null,
			finalizedAt: input.status === "finalized" ? now.toISOString() : null,
			modifier: null,
			units: 1,
			createdAt: now,
		}
	}

	async removeRvsAssignment(input: RemoveRvsAssignmentInput) {
		this.logger.log(`Removing RVS assignment: ${input.assignmentId}`)

		// TODO: Implement with actual database delete
		return { success: true }
	}

	// ========================================================================
	// OR Slots
	// ========================================================================

	async listOrSlots(input: OrSlotsInput) {
		this.logger.debug(`Listing OR slots for facility ${input.facilityId}, week: ${input.weekStart}`)

		// TODO: Implement with actual database query
		return []
	}
}
