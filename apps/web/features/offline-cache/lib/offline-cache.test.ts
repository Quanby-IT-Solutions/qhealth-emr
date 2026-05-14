import { beforeEach, describe, expect, it } from "vitest"

import {
	importOfflineSummarySnapshot,
	loadPatientEncounterSummaries,
	loadPatientSummaries,
} from "./offline-cache"

const facilityId = "550e8400-e29b-41d4-a716-446655440000"
const patientId = "770e8400-e29b-41d4-a716-446655440000"
const encounterId = "880e8400-e29b-41d4-a716-446655440000"
const preparedAt = "2026-05-14T00:00:00.000Z"

describe("offline cache snapshot import", () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it("imports a backend-prepared snapshot into patient and encounter caches", () => {
		importOfflineSummarySnapshot({
			schemaVersion: 1,
			facilityId,
			preparedAt,
			patientCount: 1,
			summaries: [
				{
					schemaVersion: 1,
					facilityId,
					preparedAt,
					sourceJobId: "660e8400-e29b-41d4-a716-446655440000",
					patient: {
						id: patientId,
						mrn: "MRN-20260514-0001",
						firstName: "Ana",
						middleName: null,
						lastName: "Santos",
						dateOfBirth: "1980-01-01",
						sex: "female",
						isActive: true,
					},
					encounterSummary: {
						encounter: {
							id: encounterId,
							facilityId,
							patientId,
							patientName: "Santos, Ana",
							patientMrn: "MRN-20260514-0001",
							patientDateOfBirth: "1980-01-01",
							patientSex: "female",
							encounterType: "inpatient",
							status: "active",
							chiefComplaint: "Fever",
							admissionDatetime: preparedAt,
							dischargeDatetime: null,
							disposition: null,
							admittingStaffName: null,
							attendingStaffName: "Dr. Reyes",
							wardName: "Ward A",
							bedNumber: "12",
							oecbEligible: false,
							transfers: [],
						},
						latestVitals: null,
						activeProblems: [],
						activeAllergies: [],
						activeMedications: [],
						activeProblemCount: 0,
						activeAllergyCount: 0,
						hasSevereAllergies: false,
					},
				},
			],
		})

		const patients = loadPatientSummaries(facilityId)
		expect(patients?.cachedAt).toBe(preparedAt)
		expect(patients?.patients[0]?.mrn).toBe("MRN-20260514-0001")

		const encounters = loadPatientEncounterSummaries(patientId)
		expect(encounters).toHaveLength(1)
		expect(encounters[0]?.cachedAt).toBe(preparedAt)
		expect(encounters[0]?.summary.encounter.id).toBe(encounterId)
	})
})
