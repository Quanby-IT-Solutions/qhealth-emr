import { describe, expect, it } from "vitest"

import {
	ActiveAllergiesResponseSchema,
	AllergenSearchResultSchema,
	AllergenSearchSchema,
	AllergySchema,
	CreateAllergySchema,
	CreateProblemSchema,
	PatientSummaryResponseSchema,
	ProblemSchema,
} from "./problems-allergies.schema.js"

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440000"
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440001"
const ALLERGY_ID = "550e8400-e29b-41d4-a716-446655440002"
const STAFF_ID = "550e8400-e29b-41d4-a716-446655440003"
const PROBLEM_ID = "550e8400-e29b-41d4-a716-446655440004"

describe("CreateProblemSchema", () => {
	it("accepts a payload with only icd10Code", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			icd10Code: "E11.9",
			description: "Type 2 diabetes mellitus without complications",
		})

		expect(result.success).toBe(true)
	})

	it("accepts a payload with only snomedCode", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			snomedCode: "44054006",
			description: "Type 2 diabetes mellitus",
		})

		expect(result.success).toBe(true)
	})

	it("accepts a payload with both icd10Code and snomedCode", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			icd10Code: "E11.9",
			snomedCode: "44054006",
			description: "Type 2 diabetes mellitus",
		})

		expect(result.success).toBe(true)
	})

	it("accepts a text-only custom diagnosis when codes are absent", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			description: "Some problem description",
		})

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.icd10Code).toBeUndefined()
			expect(result.data.snomedCode).toBeUndefined()
			expect(result.data.status).toBe("active")
		}
	})

	it("rejects an empty description", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			icd10Code: "E11.9",
			description: "",
		})

		expect(result.success).toBe(false)
	})

	it("defaults status to 'active' when omitted", () => {
		const result = CreateProblemSchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			icd10Code: "E11.9",
			description: "Type 2 diabetes mellitus",
		})

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.status).toBe("active")
		}
	})
})

describe("ProblemSchema", () => {
	it("accepts a problem marked as entered in error", () => {
		const result = ProblemSchema.safeParse({
			id: PROBLEM_ID,
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			icd10Code: "E11.9",
			icd10Display: "Type 2 diabetes mellitus without complications",
			snomedCode: null,
			snomedDisplay: null,
			description: "Type 2 diabetes mellitus",
			onsetDate: "2020-01-01",
			resolutionDate: "2026-05-21",
			status: "entered_in_error",
			documentingStaffId: STAFF_ID,
			documentingStaffName: "Dr. Smith",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		})

		expect(result.success).toBe(true)
	})
})

describe("AllergySchema", () => {
	const baseAllergy = {
		id: ALLERGY_ID,
		facilityId: FACILITY_ID,
		patientId: PATIENT_ID,
		allergenName: "Penicillin",
		allergenType: "medication" as const,
		reactionType: "Rash",
		severity: "moderate" as const,
		onsetDate: "2020-01-01",
		isActive: true,
		isVerified: false,
		verifiedAt: null,
		verifiedByStaffId: null,
		verifiedByStaffName: null,
		documentingStaffId: STAFF_ID,
		documentingStaffName: "Dr. Smith",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	}

	it("accepts a valid allergy", () => {
		const result = AllergySchema.safeParse(baseAllergy)
		expect(result.success).toBe(true)
	})

	it("accepts a verified allergy with verification metadata", () => {
		const result = AllergySchema.safeParse({
			...baseAllergy,
			isVerified: true,
			verifiedAt: "2024-02-01T00:00:00Z",
			verifiedByStaffId: STAFF_ID,
			verifiedByStaffName: "Dr. Cruz",
		})

		expect(result.success).toBe(true)
	})

	it("rejects an invalid allergenType enum value", () => {
		const result = AllergySchema.safeParse({
			...baseAllergy,
			allergenType: "unknown",
		})

		expect(result.success).toBe(false)
	})

	it("rejects an invalid severity enum value", () => {
		const result = AllergySchema.safeParse({
			...baseAllergy,
			severity: "critical",
		})

		expect(result.success).toBe(false)
	})

	it("rejects when isVerified is missing", () => {
		const { isVerified: _omit, ...withoutVerified } = baseAllergy
		const result = AllergySchema.safeParse(withoutVerified)
		expect(result.success).toBe(false)
	})
})

describe("CreateAllergySchema", () => {
	it("accepts a valid input", () => {
		const result = CreateAllergySchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			allergenName: "Peanuts",
			allergenType: "food",
			reactionType: "Anaphylaxis",
			severity: "severe",
			onsetDate: "2020-01-01",
		})

		expect(result.success).toBe(true)
	})

	it("rejects an empty allergenName", () => {
		const result = CreateAllergySchema.safeParse({
			facilityId: FACILITY_ID,
			patientId: PATIENT_ID,
			allergenName: "",
			allergenType: "food",
			severity: "mild",
		})

		expect(result.success).toBe(false)
	})
})

describe("AllergenSearchResultSchema", () => {
	it("accepts source 'drug_generic'", () => {
		const result = AllergenSearchResultSchema.safeParse({
			allergenName: "Amoxicillin",
			allergenType: "medication",
			source: "drug_generic",
		})

		expect(result.success).toBe(true)
	})

	it("accepts source 'allergy_history'", () => {
		const result = AllergenSearchResultSchema.safeParse({
			allergenName: "Shellfish",
			allergenType: "food",
			source: "allergy_history",
		})

		expect(result.success).toBe(true)
	})

	it("rejects an unknown source", () => {
		const result = AllergenSearchResultSchema.safeParse({
			allergenName: "Dust",
			allergenType: "environmental",
			source: "external_api",
		})

		expect(result.success).toBe(false)
	})
})

describe("AllergenSearchSchema", () => {
	it("requires a facilityId so allergy-history suggestions stay facility-scoped", () => {
		const result = AllergenSearchSchema.safeParse({
			search: "pen",
			allergenType: "medication",
		})

		expect(result.success).toBe(false)
	})

	it("accepts a facility-scoped search", () => {
		const result = AllergenSearchSchema.safeParse({
			search: "pen",
			facilityId: FACILITY_ID,
			allergenType: "medication",
		})

		expect(result.success).toBe(true)
	})
})

describe("ActiveAllergiesResponseSchema", () => {
	it("accepts a response with hasSevereAllergies true (verified allergy)", () => {
		const result = ActiveAllergiesResponseSchema.safeParse({
			allergies: [
				{
					id: ALLERGY_ID,
					facilityId: FACILITY_ID,
					patientId: PATIENT_ID,
					allergenName: "Penicillin",
					allergenType: "medication",
					reactionType: "Anaphylaxis",
					severity: "severe",
					onsetDate: null,
					isActive: true,
					isVerified: true,
					verifiedAt: "2024-02-01T00:00:00Z",
					verifiedByStaffId: STAFF_ID,
					verifiedByStaffName: "Dr. Cruz",
					documentingStaffId: STAFF_ID,
					documentingStaffName: "Dr. Smith",
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
			],
			hasSevereAllergies: true,
		})

		expect(result.success).toBe(true)
	})

	it("accepts an empty allergies array", () => {
		const result = ActiveAllergiesResponseSchema.safeParse({
			allergies: [],
			hasSevereAllergies: false,
		})

		expect(result.success).toBe(true)
	})
})

describe("PatientSummaryResponseSchema", () => {
	it("accepts a full summary shape", () => {
		const result = PatientSummaryResponseSchema.safeParse({
			activeProblems: [
				{
					id: PROBLEM_ID,
					facilityId: FACILITY_ID,
					patientId: PATIENT_ID,
					icd10Code: "E11.9",
					icd10Display: "Type 2 diabetes mellitus without complications",
					snomedCode: null,
					snomedDisplay: null,
					description: "Type 2 diabetes mellitus",
					onsetDate: "2020-01-01",
					resolutionDate: null,
					status: "active",
					documentingStaffId: STAFF_ID,
					documentingStaffName: "Dr. Smith",
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
			],
			activeProblemCount: 1,
			resolvedProblemCount: 0,
			activeAllergies: [
				{
					id: ALLERGY_ID,
					facilityId: FACILITY_ID,
					patientId: PATIENT_ID,
					allergenName: "Penicillin",
					allergenType: "medication",
					reactionType: "Rash",
					severity: "moderate",
					onsetDate: null,
					isActive: true,
					isVerified: false,
					verifiedAt: null,
					verifiedByStaffId: null,
					verifiedByStaffName: null,
					documentingStaffId: STAFF_ID,
					documentingStaffName: "Dr. Smith",
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
			],
			activeAllergyCount: 1,
			unverifiedAllergyCount: 1,
			hasSevereAllergies: false,
		})

		expect(result.success).toBe(true)
	})
})
