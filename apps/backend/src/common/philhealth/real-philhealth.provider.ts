import { Injectable, Logger } from "@nestjs/common"

import type { CewsEligibilityResult } from "@repo/contracts"

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
export class RealPhilHealthProvider implements PhilHealthAdapter {
	readonly providerName = "real" as const
	private readonly logger = new Logger(RealPhilHealthProvider.name)

	async checkEligibility(input: PhilHealthEligibilityInput): Promise<CewsEligibilityResult> {
		const checkedAt = new Date().toISOString()

		if (!env.PHILHEALTH_CEWS_BASE_URL) {
			return {
				philhealthId: input.philhealthId,
				isEligible: false,
				status: "error",
				memberName: null,
				memberType: null,
				patientRelation: null,
				effectivityDate: null,
				expiryDate: null,
				remainingDays: null,
				remainingBenefit: null,
				errorMessage: "PHILHEALTH_CEWS_BASE_URL is not configured.",
				checkedAt,
			}
		}

		try {
			const url = new URL("/cews/eligibility", env.PHILHEALTH_CEWS_BASE_URL)
			url.searchParams.set("philhealthId", input.philhealthId)
			url.searchParams.set("facilityId", input.facilityId)
			if (input.patientId) {
				url.searchParams.set("patientId", input.patientId)
			}

			const response = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					...(env.PHILHEALTH_CEWS_API_KEY ? { Authorization: `Bearer ${env.PHILHEALTH_CEWS_API_KEY}` } : {}),
				},
			})

			const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
			if (!response.ok) {
				return {
					philhealthId: input.philhealthId,
					isEligible: false,
					status: "error",
					memberName: null,
					memberType: null,
					patientRelation: null,
					effectivityDate: null,
					expiryDate: null,
					remainingDays: null,
					remainingBenefit: null,
					errorMessage:
						typeof payload?.message === "string"
							? payload.message
							: `PhilHealth CEWS request failed with status ${response.status}.`,
					checkedAt,
				}
			}

			const expiryDate = typeof payload?.expiryDate === "string" ? payload.expiryDate : null
			const isEligible = Boolean(payload?.isEligible ?? payload?.eligible)
			const status: "eligible" | "ineligible" | "pending" | "error" =
				payload?.status === "eligible" ||
				payload?.status === "ineligible" ||
				payload?.status === "pending" ||
				payload?.status === "error"
					? payload.status
					: isEligible
						? "eligible"
						: "ineligible"

			return {
				philhealthId: input.philhealthId,
				isEligible,
				status,
				memberName: typeof payload?.memberName === "string" ? payload.memberName : null,
				memberType: normalizeMemberType(payload?.memberType),
				patientRelation: normalizePatientRelation(payload?.patientRelation),
				effectivityDate: typeof payload?.effectivityDate === "string" ? payload.effectivityDate : null,
				expiryDate,
				remainingDays:
					typeof payload?.remainingDays === "number"
						? payload.remainingDays
						: getRemainingDays(expiryDate),
				remainingBenefit:
					typeof payload?.remainingBenefit === "number"
						? payload.remainingBenefit
						: typeof payload?.remainingCoverage === "number"
							? payload.remainingCoverage
							: null,
				errorMessage: typeof payload?.errorMessage === "string" ? payload.errorMessage : null,
				checkedAt,
			}
		} catch (error) {
			this.logger.error(`PhilHealth eligibility request failed: ${error}`)
			return {
				philhealthId: input.philhealthId,
				isEligible: false,
				status: "error",
				memberName: null,
				memberType: null,
				patientRelation: null,
				effectivityDate: null,
				expiryDate: null,
				remainingDays: null,
				remainingBenefit: null,
				errorMessage: error instanceof Error ? error.message : "Unknown PhilHealth CEWS error.",
				checkedAt,
			}
		}
	}

	async submitClaim(input: PhilHealthClaimSubmissionInput): Promise<PhilHealthClaimSubmissionResult> {
		const submittedAt = new Date().toISOString()

		if (!env.PHILHEALTH_CEWS_BASE_URL) {
			return {
				provider: this.providerName,
				success: false,
				transactionId: null,
				status: "failed",
				message: "PHILHEALTH_CEWS_BASE_URL is not configured.",
				response: null,
				submittedAt,
			}
		}

		try {
			const response = await fetch(new URL(`/claims/${input.claimType}`, env.PHILHEALTH_CEWS_BASE_URL), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					...(env.PHILHEALTH_CEWS_API_KEY ? { Authorization: `Bearer ${env.PHILHEALTH_CEWS_API_KEY}` } : {}),
				},
				body: JSON.stringify({ claimId: input.claimId, facilityId: input.facilityId, payload: input.payload }),
			})

			const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
			return {
				provider: this.providerName,
				success: response.ok,
				transactionId: typeof payload?.transactionId === "string" ? payload.transactionId : null,
				status: response.ok ? "submitted" : "failed",
				message: typeof payload?.message === "string" ? payload.message : null,
				response: payload,
				submittedAt,
			}
		} catch (error) {
			this.logger.error(`PhilHealth claim submission failed: ${error}`)
			return {
				provider: this.providerName,
				success: false,
				transactionId: null,
				status: "failed",
				message: error instanceof Error ? error.message : "Unknown PhilHealth claim submission error.",
				response: null,
				submittedAt,
			}
		}
	}

	async getCewsStatus(input: PhilHealthCewsStatusInput): Promise<PhilHealthCewsStatusResult> {
		const checkedAt = new Date().toISOString()

		if (!env.PHILHEALTH_CEWS_BASE_URL) {
			return {
				provider: this.providerName,
				transactionId: input.transactionId,
				status: "failed",
				message: "PHILHEALTH_CEWS_BASE_URL is not configured.",
				checkedAt,
				response: null,
			}
		}

		try {
			const response = await fetch(new URL(`/cews/status/${input.transactionId}`, env.PHILHEALTH_CEWS_BASE_URL), {
				method: "GET",
				headers: {
					Accept: "application/json",
					...(env.PHILHEALTH_CEWS_API_KEY ? { Authorization: `Bearer ${env.PHILHEALTH_CEWS_API_KEY}` } : {}),
				},
			})

			const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
			return {
				provider: this.providerName,
				transactionId: input.transactionId,
				status:
					payload?.status === "completed" ||
					payload?.status === "pending" ||
					payload?.status === "failed" ||
					payload?.status === "not_found"
						? payload.status
						: response.ok
							? "completed"
							: "failed",
				message: typeof payload?.message === "string" ? payload.message : null,
				checkedAt,
				response: payload,
			}
		} catch (error) {
			this.logger.error(`PhilHealth CEWS status lookup failed: ${error}`)
			return {
				provider: this.providerName,
				transactionId: input.transactionId,
				status: "failed",
				message: error instanceof Error ? error.message : "Unknown PhilHealth CEWS status error.",
				checkedAt,
				response: null,
			}
		}
	}
}