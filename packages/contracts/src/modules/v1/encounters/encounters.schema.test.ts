import { describe, expect, it } from "vitest"

import { CreateEncounterSchema, LinkedEncounterListSchema } from "./encounters.schema"

describe("CreateEncounterSchema", () => {
	it("rejects outpatient encounters without consentCaptured", () => {
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

	it("rejects emergency encounters without consentCaptured", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "emergency",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(false)
	})

	it("rejects inpatient encounters without consentCaptured", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "inpatient",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
		})

		expect(result.success).toBe(false)
	})

	it("accepts telemedicine encounters with consentCaptured: false", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "telemedicine",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
			consentCaptured: false,
		})

		expect(result.success).toBe(true)
	})

	it("accepts a valid outpatient payload with triage, clinician, and consentCaptured", () => {
		const result = CreateEncounterSchema.safeParse({
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			patientId: "550e8400-e29b-41d4-a716-446655440001",
			encounterType: "outpatient",
			admittingStaffId: "550e8400-e29b-41d4-a716-446655440002",
			attendingStaffId: "550e8400-e29b-41d4-a716-446655440003",
			clinicianStaffId: "550e8400-e29b-41d4-a716-446655440003",
			triageIntakeId: "550e8400-e29b-41d4-a716-446655440004",
			consentCaptured: true,
		})

		expect(result.success).toBe(true)
	})
})

describe("LinkedEncounterListSchema", () => {
	it("accepts telemedicine follow-ups alongside core linked encounters", () => {
		const result = LinkedEncounterListSchema.safeParse({
			sourceEncounterId: "550e8400-e29b-41d4-a716-446655440000",
			linkedEncounters: [
				{
					id: "550e8400-e29b-41d4-a716-446655440001",
					source: "telemedicine",
					appointmentId: "550e8400-e29b-41d4-a716-446655440002",
					encounterType: "telemedicine",
					status: "active",
					admissionDatetime: "2026-05-18T08:00:00.000Z",
					dischargeDatetime: null,
					attendingStaffName: "Dr. Reyes",
					chiefComplaint: "Follow-up",
					diagnosis: "Improving",
					clinicianName: "Dr. Reyes",
				},
			],
		})

		expect(result.success).toBe(true)
	})
})
