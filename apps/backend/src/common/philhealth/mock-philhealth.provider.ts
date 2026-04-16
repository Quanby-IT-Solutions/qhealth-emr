import { Injectable } from "@nestjs/common"

import { env } from "@/config/env.config"

import {
	getRemainingDays,
	normalizeMemberType,
	normalizePatientRelation,
	type PhilHealthAdapter,
	type PhilHealthCewsStatusInput,
	type PhilHealthCewsStatusResult,
	type PhilHealthClaimSubmissionInput,
	type PhilHealthClaimSubmissionResult,
	type PhilHealthEligibilityInput,
} from "./philhealth.adapter"

@Injectable()
export class MockPhilHealthProvider implements PhilHealthAdapter {
	readonly providerName = "mock" as const

	async checkEligibility(input: PhilHealthEligibilityInput) {
		const checkedAt = new Date().toISOString()
		const isEligible = env.PHILHEALTH_MOCK_ELIGIBLE
		const status = env.PHILHEALTH_MOCK_ELIGIBILITY_STATUS
		const memberType = normalizeMemberType(env.PHILHEALTH_MOCK_MEMBER_TYPE)
		const patientRelation = normalizePatientRelation(env.PHILHEALTH_MOCK_PATIENT_RELATION)

		return {
			philhealthId: input.philhealthId,
			isEligible,
			status,
			memberName: env.PHILHEALTH_MOCK_MEMBER_NAME,
			memberType,
			patientRelation,
			effectivityDate: env.PHILHEALTH_MOCK_EFFECTIVITY_DATE,
			expiryDate: env.PHILHEALTH_MOCK_EXPIRY_DATE,
			remainingDays: getRemainingDays(env.PHILHEALTH_MOCK_EXPIRY_DATE),
			remainingBenefit: env.PHILHEALTH_MOCK_REMAINING_BENEFIT,
			errorMessage: status === "error" ? env.PHILHEALTH_MOCK_ERROR_MESSAGE : null,
			checkedAt,
		}
	}

	async submitClaim(input: PhilHealthClaimSubmissionInput): Promise<PhilHealthClaimSubmissionResult> {
		return {
			provider: this.providerName,
			success: true,
			transactionId: `mock-${input.claimType}-${input.claimId}`,
			status: "submitted",
			message: "Mock PhilHealth submission accepted.",
			response: {
				claimId: input.claimId,
				claimType: input.claimType,
				accepted: true,
			},
			submittedAt: new Date().toISOString(),
		}
	}

	async getCewsStatus(input: PhilHealthCewsStatusInput): Promise<PhilHealthCewsStatusResult> {
		return {
			provider: this.providerName,
			transactionId: input.transactionId,
			status: "completed",
			message: "Mock CEWS status lookup completed.",
			checkedAt: new Date().toISOString(),
			response: {
				transactionId: input.transactionId,
				status: "completed",
			},
		}
	}
}