import { describe, expect, it } from "vitest"

import { CreateEncounterSchema } from "./encounters.schema"

const validConsent = {
	signedByName: "Juan Dela Cruz",
	relationship: "self" as const,
	content: '{"rightsAcknowledged":true}',
	signatureData: "data:image/png;base64,signature",
}

describe("CreateEncounterSchema", () => {
	it("rejects outpatient encounters without DPA consent", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "outpatient",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
			clinicianStaffId: "550e8400-e29b-41d4-a716-446655440003",
			triageIntakeId: "550e8400-e29b-41d4-a716-446655440004",
		})

		expect(result.success).toBe(false)
	})

	it("rejects emergency encounters without DPA consent", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "emergency",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(false)
	})

	it("rejects inpatient encounters without DPA consent", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "inpatient",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(false)
	})

	it("allows telemedicine encounters without DPA consent", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "telemedicine",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(true)
	})

	it("accepts a valid outpatient payload with triage, clinician, and DPA consent", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "outpatient",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
			attendingStaffId: "550e8400-e29b-41d4-a716-446655440003",
			clinicianStaffId: "550e8400-e29b-41d4-a716-446655440003",
			triageIntakeId: "550e8400-e29b-41d4-a716-446655440004",
			dpaConsent: validConsent,
		})

		expect(result.success).toBe(true)
	})
})
