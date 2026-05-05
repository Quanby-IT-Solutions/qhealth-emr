import type { CewsEligibilityResult } from "@repo/contracts"

export const PHILHEALTH_ADAPTER = "PHILHEALTH_ADAPTER"

export type PhilHealthMode = "mock" | "real"
export type PhilHealthMemberType =
	| "employed"
	| "self_employed"
	| "voluntary"
	| "indigent"
	| "sponsored"
	| "senior_citizen"
	| "pwd"
	| "ofw"
	| "kasambahay"
export type PhilHealthPatientRelation = "member" | "spouse" | "child" | "parent" | "dependent"

export interface PhilHealthEligibilityInput {
	philhealthId: string
	facilityId: string
	patientId?: string
}

export interface PhilHealthClaimSubmissionInput {
	claimId: string
	claimType: "cf4" | "cf5" | "konsulta"
	facilityId: string
	payload?: Record<string, unknown>
}

export interface PhilHealthClaimSubmissionResult {
	provider: PhilHealthMode
	success: boolean
	transactionId: string | null
	status: "submitted" | "pending" | "failed"
	message: string | null
	response: Record<string, unknown> | null
	submittedAt: string
}

export interface PhilHealthCewsStatusInput {
	transactionId: string
	facilityId: string
}

export interface PhilHealthCewsStatusResult {
	provider: PhilHealthMode
	transactionId: string
	status: "completed" | "pending" | "failed" | "not_found"
	message: string | null
	checkedAt: string
	response: Record<string, unknown> | null
}

export interface PhilHealthAdapter {
	readonly providerName: PhilHealthMode
	checkEligibility(input: PhilHealthEligibilityInput): Promise<CewsEligibilityResult>
	submitClaim(input: PhilHealthClaimSubmissionInput): Promise<PhilHealthClaimSubmissionResult>
	getCewsStatus(input: PhilHealthCewsStatusInput): Promise<PhilHealthCewsStatusResult>
}

export function normalizeMemberType(value: unknown): PhilHealthMemberType | null {
	return value === "employed" ||
		value === "self_employed" ||
		value === "voluntary" ||
		value === "indigent" ||
		value === "sponsored" ||
		value === "senior_citizen" ||
		value === "pwd" ||
		value === "ofw" ||
		value === "kasambahay"
		? value
		: null
}

export function normalizePatientRelation(value: unknown): PhilHealthPatientRelation | null {
	return value === "member" ||
		value === "spouse" ||
		value === "child" ||
		value === "parent" ||
		value === "dependent"
		? value
		: null
}

export function getRemainingDays(expiryDate: string | null): number | null {
	if (!expiryDate) {
		return null
	}

	const expiry = new Date(expiryDate)
	if (Number.isNaN(expiry.getTime())) {
		return null
	}

	const diffInMs = expiry.getTime() - Date.now()
	return Math.max(0, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)))
}
