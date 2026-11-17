import { describe, expect, it } from "vitest"

import { PatientSearchSchema, RegisterPatientWithOpdEncounterInputSchema } from "./patients.schema"

describe("PatientSearchSchema", () => {
	it("coerces isActive from GET query params", () => {
		const result = PatientSearchSchema.parse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			isActive: "true",
			page: "1",
			limit: "100",
		})

		expect(result.isActive).toBe(true)
		expect(result.page).toBe(1)
		expect(result.limit).toBe(100)
	})
})

describe("RegisterPatientWithOpdEncounterInputSchema", () => {
	const baseRegistration = {
		facilityId: "550e8400-e29b-41d4-a716-446655440000",
		firstName: "Ana",
		lastName: "Santos",
		dateOfBirth: "1980-01-01",
		sex: "female" as const,
	}

	it("allows direct OPD registration without triage or clinician assignment", () => {
		const result = RegisterPatientWithOpdEncounterInputSchema.safeParse(baseRegistration)

		expect(result.success).toBe(true)
	})

	it("still accepts triage-linked clinician-scoped registration", () => {
		const result = RegisterPatientWithOpdEncounterInputSchema.safeParse({
			...baseRegistration,
			clinicianStaffId: "550e8400-e29b-41d4-a716-446655440001",
			pendingTriageId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(true)
	})
})
