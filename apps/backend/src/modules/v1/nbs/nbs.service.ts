import { Injectable, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import type {
	NbsScreening,
	NbsConsent,
	NbsReferral,
	NbsLogbookQuery,
	NbsLogbookResponse,
	CreateNbsScreening,
	UpdateNbsScreening,
	CreateNbsConsent,
	CreateNbsReferral,
	UpdateNbsReferral,
} from "@repo/contracts"

@Injectable()
export class NbsService {
	// ========================================================================
	// Screening
	// ========================================================================

	async getScreeningByEncounter(encounterId: string): Promise<NbsScreening | null> {
		// Stub implementation
		void encounterId
		return null
	}

	async createScreening(input: CreateNbsScreening, performedBy: string): Promise<NbsScreening> {
		// Stub implementation
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			encounterId: input.encounterId,
			patientId: input.patientId,
			facilityId: input.facilityId,
			birthDatetime: new Date(input.birthDatetime),
			specimenCollectedAt: input.specimenCollectedAt ? new Date(input.specimenCollectedAt) : null,
			specimenSentAt: null,
			resultReceivedAt: null,
			specimenType: input.specimenType ?? null,
			specimenBarcode: input.specimenBarcode ?? null,
			specimenCollectedBy: input.specimenCollectedBy ?? null,
			specimenCollectedByName: null,
			status: "pending",
			result_ch: null,
			result_cah: null,
			result_g6pd: null,
			result_gal: null,
			result_pku: null,
			result_msud: null,
			result_overall: null,
			notes: input.notes ?? null,
			performedBy,
			performedByName: "System User",
			createdAt: now,
			updatedAt: now,
		}
	}

	async updateScreening(input: UpdateNbsScreening): Promise<NbsScreening> {
		// Stub implementation - throws not found
		throw new NotFoundException(`NBS screening with id ${input.id} not found`)
	}

	// ========================================================================
	// Consent
	// ========================================================================

	async getConsentByNbsId(nbsId: string): Promise<NbsConsent | null> {
		// Stub implementation
		void nbsId
		return null
	}

	async createConsent(input: CreateNbsConsent, performedBy: string): Promise<NbsConsent> {
		// Stub implementation
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			nbsId: input.nbsId,
			encounterId: input.encounterId,
			patientId: input.patientId,
			consentType: input.consentType,
			parentName: input.parentName,
			relationship: input.relationship,
			waiverReason: input.waiverReason ?? null,
			signatureDataUrl: input.signatureDataUrl ?? null,
			signedAt: now,
			witnessName: input.witnessName ?? null,
			performedBy,
			performedByName: "System User",
			createdAt: now,
		}
	}

	// ========================================================================
	// Referrals
	// ========================================================================

	async getReferralsByNbsId(nbsId: string): Promise<NbsReferral[]> {
		// Stub implementation
		void nbsId
		return []
	}

	async createReferral(input: CreateNbsReferral, performedBy: string): Promise<NbsReferral> {
		// Stub implementation
		const now = new Date()
		return {
			id: crypto.randomUUID(),
			nbsId: input.nbsId,
			encounterId: input.encounterId,
			patientId: input.patientId,
			referredCondition: input.referredCondition,
			referralFacility: input.referralFacility,
			referralDatetime: new Date(input.referralDatetime),
			referralStatus: "pending",
			acceptedAt: null,
			completedAt: null,
			referralNotes: input.referralNotes ?? null,
			performedBy,
			performedByName: "System User",
			createdAt: now,
			updatedAt: now,
		}
	}

	async updateReferral(input: UpdateNbsReferral): Promise<NbsReferral> {
		// Stub implementation - throws not found
		throw new NotFoundException(`NBS referral with id ${input.id} not found`)
	}

	// ========================================================================
	// Logbook
	// ========================================================================

	async getLogbook(query: NbsLogbookQuery): Promise<NbsLogbookResponse> {
		// Stub implementation - returns empty paginated response
		const page = query.page ?? 1
		const limit = query.limit ?? 25

		return {
			data: [],
			total: 0,
			page,
			limit,
			totalPages: 0,
		}
	}
}
